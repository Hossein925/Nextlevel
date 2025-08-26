import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { upload } from '@vercel/blob/client';
import { Department, StaffMember, View, SkillCategory, Assessment, Hospital, AppScreen, NamedChecklistTemplate, ExamTemplate, ExamSubmission, LoggedInUser, UserRole, TrainingMaterial, MonthlyTraining, NewsBanner, MonthlyWorkLog, Patient, ChatMessage, AdminMessage } from '../types';
import WelcomeScreen from '../components/WelcomeScreen';
import HospitalList from '../components/HospitalList';
import DepartmentList from '../components/DepartmentList';
import DepartmentView from '../components/DepartmentView';
import StaffMemberView from '../components/StaffMemberView';
import ChecklistManager from '../components/ChecklistManager';
import ExamManager from '../components/ExamManager';
import TrainingManager from '../components/TrainingManager';
import AccreditationManager from '../components/AccreditationManager';
import NewsBannerManager from '../components/NewsBannerManager';
import PatientEducationManager from '../components/PatientEducationManager';
import PatientPortalView from '../components/PatientPortalView';
import AboutModal from '../components/AboutModal';
import LoginModal from '../components/LoginModal';
import { SaveIcon } from '../components/icons/SaveIcon';
import { UploadIcon } from '../components/icons/UploadIcon';
import { InfoIcon } from '../components/icons/InfoIcon';
import { LogoutIcon } from '../components/icons/LogoutIcon';
import { BackIcon } from '../components/icons/BackIcon';
import AdminCommunicationView from '../components/AdminCommunicationView';
import HospitalCommunicationView from '../components/HospitalCommunicationView';
import { createClient } from '../utils/supabase/client';
import { SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;
let supabaseInitializationError: string | null = null;
try {
  supabase = createClient();
} catch (error) {
  supabaseInitializationError = (error as Error).message;
}

const PERSIAN_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد",
  "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر",
  "دی", "بهمن", "اسفند"
];

type MessageContent = { text?: string; file?: { path: string; name: string; type: string } };

const HomePage: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [appScreen, setAppScreen] = useState<AppScreen>(AppScreen.Welcome);
  const [currentView, setCurrentView] = useState<View>(View.DepartmentList);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [initializationError, setInitializationError] = useState<string | null>(supabaseInitializationError);

  // --- Data Fetching from Supabase ---
  const fetchData = useCallback(async () => {
    if (!supabase) {
      setIsDataLoaded(true);
      return;
    }
    setIsDataLoaded(false);
    
    // This is a simplified fetch. In a real-world app with large data,
    // you would fetch data scoped to the user's role and selection.
    const { data, error } = await supabase
      .from('hospitals')
      .select(`*,
        departments (*,
          staff:staff_members (*,
            assessments (*),
            work_logs (*)
          ),
          patients (*,
            chat_history
          ),
          patient_education_materials:training_materials(
            id, name, type, description, file_path, material_type
          )
        ),
        checklist_templates (*),
        exam_templates (*),
        training_materials (*),
        accreditation_materials:training_materials(
          id, name, type, description, file_path, material_type
        ),
        news_banners (*),
        admin_messages (*)
      `);
      
    if (error) {
      console.error("Error fetching data:", error);
      setInitializationError(`خطا در بارگذاری اطلاعات از پایگاه داده: ${error.message}. لطفاً از صحت اطلاعات اتصال و سطح دسترسی (RLS) اطمینان حاصل کنید.`);
      setIsDataLoaded(true);
      return;
    }

    // Transform Supabase data (snake_case, flat structure) to app's nested camelCase format
    const transformedHospitals: Hospital[] = data.map((h: any) => {
      const materialsByMonth = new Map<string, TrainingMaterial[]>();
      (h.training_materials || []).forEach((m: any) => {
          if (!m.month) return;
          if (!materialsByMonth.has(m.month)) {
              materialsByMonth.set(m.month, []);
          }
          materialsByMonth.get(m.month)!.push({
              id: m.id,
              name: m.name,
              type: m.type,
              filePath: m.file_path,
              description: m.description,
          });
      });

      return {
        id: h.id,
        name: h.name,
        province: h.province,
        city: h.city,
        supervisorName: h.supervisor_name,
        supervisorNationalId: h.supervisor_national_id,
        supervisorPassword: h.supervisor_password,
        departments: (h.departments || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          managerName: d.manager_name,
          managerNationalId: d.manager_national_id,
          managerPassword: d.manager_password,
          staffCount: d.staff_count,
          bedCount: d.bed_count,
          staff: (d.staff || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            title: s.title,
            nationalId: s.national_id,
            password: s.password,
            assessments: s.assessments || [],
            workLogs: s.work_logs || [],
          })),
          patientEducationMaterials: (d.patient_education_materials || []).map((m: any) => ({
             id: m.id, name: m.name, type: m.type, filePath: m.file_path, description: m.description,
          })),
          patients: (d.patients || []).map((p: any) => ({
             id: p.id, name: p.name, nationalId: p.national_id, password: p.password, chatHistory: p.chat_history || [],
          })),
        })),
        checklistTemplates: h.checklist_templates || [],
        examTemplates: h.exam_templates || [],
        trainingMaterials: Array.from(materialsByMonth.entries()).map(([month, materials]) => ({ month, materials })),
        accreditationMaterials: (h.accreditation_materials || []).map((m: any) => ({
            id: m.id, name: m.name, type: m.type, filePath: m.file_path, description: m.description,
        })),
        newsBanners: (h.news_banners || []).map((b: any) => ({
            id: b.id, title: b.title, description: b.description, imagePath: b.image_path,
        })),
        adminMessages: h.admin_messages || [],
      };
    });

    setHospitals(transformedHospitals);
    setIsDataLoaded(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const findHospital = useCallback((hospitalId: string | null) => hospitals.find(h => h.id === hospitalId), [hospitals]);
  const findDepartment = useCallback((hospital: Hospital | undefined, departmentId: string | null) => hospital?.departments.find(d => d.id === departmentId), []);
  const findStaffMember = useCallback((department: Department | undefined, staffId: string | null) => department?.staff.find(s => s.id === staffId), []);

  // --- Data Handlers (Now with Supabase DB + Vercel Blob) ---
  const handleAddHospital = async (name: string, province: string, city: string, supervisorName: string, supervisorNationalId: string, supervisorPassword: string) => {
    if (!supabase) return;
    const newHospitalId = `hosp-${Date.now()}`;

    const { error } = await supabase.from('hospitals').insert({
        id: newHospitalId, name, province, city,
        supervisor_name: supervisorName,
        supervisor_national_id: supervisorNationalId,
        supervisor_password: supervisorPassword,
        admin_messages: [],
    });

    if (error) {
        console.error("Error adding hospital:", error);
        alert(`خطا در افزودن بیمارستان: ${error.message}`);
    } else {
        await fetchData();
    }
  };
  
  // --- Hospital Handlers ---
  const handleUpdateHospital = async (id: string, updatedData: Partial<Omit<Hospital, 'id' | 'departments' | 'checklistTemplates' | 'examTemplates' | 'trainingMaterials' | 'newsBanners'>>) => {
      setHospitals(hospitals.map(h => h.id === id ? { ...h, ...updatedData } : h));
  }

  const handleDeleteHospital = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('hospitals').delete().eq('id', id);
    if(error){
        alert(`Failed to delete hospital: ${error.message}`);
    } else {
        await fetchData();
    }
  };

  // --- Department Handlers ---
  const handleAddDepartment = async (name: string, managerName: string, managerNationalId: string, managerPassword: string, staffCount: number, bedCount: number) => {
    if (!selectedHospitalId || !supabase) return;
    const newDepartmentId = `dept-${Date.now()}`;
    
    const { error } = await supabase.from('departments').insert({
        id: newDepartmentId,
        hospital_id: selectedHospitalId,
        name,
        manager_name: managerName,
        manager_national_id: managerNationalId,
        manager_password: managerPassword,
        staff_count: staffCount,
        bed_count: bedCount,
    });
    
    if (error) {
        alert(`Failed to add department: ${error.message}`);
        console.error(error);
    } else {
        await fetchData();
    }
  };

  const handleUpdateDepartment = async (id: string, updatedData: Partial<Omit<Department, 'id' | 'staff'>>) => {
    setHospitals(hospitals.map(h => {
        if (h.id === selectedHospitalId) {
            return {
                ...h,
                departments: h.departments.map(d => d.id === id ? { ...d, ...updatedData } : d)
            };
        }
        return h;
    }));
  }

  const handleDeleteDepartment = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if(error){
        alert(`Failed to delete department: ${error.message}`);
    } else {
        await fetchData();
    }
  };

  const handleResetHospital = async (supervisorNationalId: string, supervisorPassword: string): Promise<boolean> => {
    if (!supabase) return false;
    const hospital = findHospital(selectedHospitalId);
    if (!hospital) return false;

    if (hospital.supervisorNationalId === supervisorNationalId && hospital.supervisorPassword === supervisorPassword) {
        const { error } = await supabase.from('departments').delete().eq('hospital_id', hospital.id);
        if (error) {
            alert("Failed to reset hospital departments.");
            return false;
        }
        setHospitals(hospitals.map(h =>
            h.id === selectedHospitalId ? { ...h, departments: [] } : h
        ));
        return true;
    }
    return false;
  };
  
  // --- Material / File Handlers (using Vercel Blob) ---
  const handleAddMaterial = async (
    material: Omit<TrainingMaterial, 'id' | 'filePath'>,
    file: File,
    context: { hospitalId: string, departmentId?: string, month?: string, type: 'monthly_staff' | 'accreditation' | 'patient_education' }
  ) => {
    if (!supabase) return;
    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });
      
      const materialId = `mat-${Date.now()}`;
      
      const { error: dbError } = await supabase.from('training_materials').insert({
        id: materialId,
        hospital_id: context.hospitalId,
        department_id: context.departmentId,
        material_type: context.type,
        month: context.month,
        name: file.name,
        type: file.type, 
        description: material.description,
        file_path: newBlob.url // Store the Vercel Blob URL
      });

      if (dbError) throw dbError;
      
      await fetchData();

    } catch (error) {
      alert('Error uploading file.');
      console.error(error);
    }
  };
  
  const handleDeleteMaterial = async (materialId: string) => {
    if (!supabase) return;
    const materialToDelete = hospitals
        .flatMap(h => [...(h.accreditationMaterials || []), ...(h.trainingMaterials || []).flatMap(t => t.materials), ...(h.departments || []).flatMap(d => d.patientEducationMaterials || [])])
        .find(m => m.id === materialId);
        
    if (!materialToDelete || !materialToDelete.filePath) {
      alert("Material not found or has no file path.");
      return;
    }
    
    try {
      const res = await fetch('/api/delete-blob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: materialToDelete.filePath }),
      });
      if (!res.ok) throw new Error('Failed to delete file from storage.');

      const { error: dbError } = await supabase.from('training_materials').delete().eq('id', materialId);
      if (dbError) throw dbError;
      
      await fetchData();
    } catch(error) {
        alert('Failed to delete material.');
        console.error(error);
    }
  };
  
  const handleUpdateMaterialDescription = async (materialId: string, description: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('training_materials').update({ description }).eq('id', materialId);
    if(error){
      alert("Failed to update description");
    } else {
      await fetchData();
    }
  }

  // --- News Banner Handlers ---
  const handleAddNewsBanner = async (banner: Omit<NewsBanner, 'id' | 'imagePath'>, imageFile: File) => {
    if (!selectedHospitalId || !supabase) return;
    try {
        const newBlob = await upload(imageFile.name, imageFile, {
            access: 'public',
            handleUploadUrl: '/api/upload',
        });
        
        const bannerId = `banner-${Date.now()}`;
        const { error: dbError } = await supabase.from('news_banners').insert({
            id: bannerId,
            hospital_id: selectedHospitalId,
            title: banner.title,
            description: banner.description,
            image_path: newBlob.url,
        });
        
        if (dbError) throw dbError;
        await fetchData();

    } catch(error) {
        alert('Error saving banner.');
        console.error(error);
    }
  };

  const handleDeleteNewsBanner = async (bannerId: string) => {
      if (!supabase) return;
      const hospital = findHospital(selectedHospitalId);
      const banner = hospital?.newsBanners?.find(b => b.id === bannerId);
      if(!banner || !banner.imagePath) return;

      try {
        await fetch('/api/delete-blob', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: banner.imagePath }),
        });

        await supabase.from('news_banners').delete().eq('id', bannerId);
        await fetchData();
      } catch (error) {
        alert('Failed to delete banner.');
        console.error(error);
      }
  };

  const handleUpdateNewsBanner = async (bannerId: string, title: string, description: string) => {
      if (!supabase) return;
      await supabase.from('news_banners').update({ title, description }).eq('id', bannerId);
      await fetchData();
  };
  
  // --- Chat Message Handler ---
  const handleSendChatMessage = async (
    ids: { hospitalId: string; departmentId?: string; patientId?: string },
    content: { text?: string; file?: File },
    sender: 'patient' | 'manager' | 'hospital' | 'admin'
  ) => {
      if (!supabase) return;
      let messageContent: MessageContent = { text: content.text };

      if (content.file) {
          try {
              const newBlob = await upload(content.file.name, content.file, {
                access: 'public',
                handleUploadUrl: '/api/upload',
              });
              messageContent.file = { path: newBlob.url, name: newBlob.pathname, type: content.file.type };
          } catch(e) {
              alert("Error uploading attachment.");
              console.error(e);
              return;
          }
      }
      
      if (!messageContent.text && !messageContent.file) return;

      const newMessage = {
          id: `msg-${Date.now()}`,
          sender,
          timestamp: new Date().toISOString(),
          ...messageContent
      };

      if (ids.patientId && ids.departmentId) {
          const hospital = findHospital(ids.hospitalId);
          const department = findDepartment(hospital, ids.departmentId);
          const patient = department?.patients?.find(p => p.id === ids.patientId);
          if (!patient) return;

          const updatedChatHistory = [...(patient.chatHistory || []), newMessage];
          const { error } = await supabase
              .from('patients')
              .update({ chat_history: updatedChatHistory })
              .eq('id', ids.patientId);
          
          if (error) {
              alert('Failed to send message.');
              console.error(error);
          }
      } else { 
          const hospital = findHospital(ids.hospitalId);
          if (!hospital) return;

          const updatedAdminMessages = [...(hospital.adminMessages || []), newMessage];
          const { error } = await supabase
              .from('hospitals')
              .update({ admin_messages: updatedAdminMessages })
              .eq('id', ids.hospitalId);

          if (error) {
              alert('Failed to send message.');
              console.error(error);
          }
      }
      
      await fetchData();
  };

  // --- Login and Navigation ---
  const handleGoToWelcome = () => {
    setAppScreen(AppScreen.Welcome);
    setSelectedHospitalId(null);
    setSelectedDepartmentId(null);
    setSelectedStaffId(null);
    setCurrentView(View.DepartmentList);
    setLoggedInUser(null);
  }

  const handleSelectHospital = (id: string) => {
    setSelectedHospitalId(id);
    setAppScreen(AppScreen.MainApp);
    setCurrentView(View.DepartmentList);
  };

  const handleSelectDepartment = (id: string) => {
    setSelectedDepartmentId(id);
    setCurrentView(View.DepartmentView);
  };

  const handleSelectStaff = (id: string) => {
    setSelectedStaffId(id);
    setCurrentView(View.StaffMemberView);
  };
  
  const handleLogin = (nationalId: string, password: string) => {
    setLoginError(null);
    if (!nationalId || !password) {
        setLoginError('کد ملی و رمز عبور الزامی است.');
        return;
    }

    if (nationalId === "5850008985" && password === "64546") {
      setLoggedInUser({ role: UserRole.Admin, name: 'ادمین کل' });
      setIsLoginModalOpen(false);
      if (appScreen === AppScreen.Welcome) {
        setAppScreen(AppScreen.HospitalList);
      }
      return;
    }

    for(const hospital of hospitals) {
        if (hospital.supervisorNationalId === nationalId && hospital.supervisorPassword === password) {
            setLoggedInUser({ role: UserRole.Supervisor, name: hospital.supervisorName || 'سوپروایزر', hospitalId: hospital.id });
            handleSelectHospital(hospital.id);
            setIsLoginModalOpen(false);
            return;
        }
        for(const department of hospital.departments) {
            if (department.managerNationalId === nationalId && department.managerPassword === password) {
                setLoggedInUser({ role: UserRole.Manager, name: department.managerName, hospitalId: hospital.id, departmentId: department.id });
                handleSelectHospital(hospital.id);
                handleSelectDepartment(department.id);
                setIsLoginModalOpen(false);
                return;
            }
            for (const staff of department.staff) {
                if (staff.nationalId === nationalId && staff.password === password) {
                    setLoggedInUser({ role: UserRole.Staff, name: staff.name, hospitalId: hospital.id, departmentId: department.id, staffId: staff.id });
                    handleSelectHospital(hospital.id);
                    handleSelectDepartment(department.id);
                    handleSelectStaff(staff.id);
                    setIsLoginModalOpen(false);
                    return;
                }
            }
            for (const patient of department.patients || []) {
                if (patient.nationalId === nationalId && patient.password === password) {
                    setLoggedInUser({ role: UserRole.Patient, name: patient.name, hospitalId: hospital.id, departmentId: department.id, patientId: patient.id });
                    setAppScreen(AppScreen.MainApp);
                    setCurrentView(View.PatientPortal);
                    setIsLoginModalOpen(false);
                    return;
                }
            }
        }
    }
    setLoginError('کد ملی یا رمز عبور نامعتبر است.');
  }

  const handleLogout = () => {
    setLoggedInUser(null);
    setSelectedHospitalId(null);
    setSelectedDepartmentId(null);
    setSelectedStaffId(null);
    setCurrentView(View.DepartmentList);
    setAppScreen(AppScreen.Welcome);
  }
  
  const handleBack = () => {
    switch (currentView) {
      case View.StaffMemberView:
        setSelectedStaffId(null);
        setCurrentView(View.DepartmentView);
        break;
      case View.DepartmentView:
      case View.ChecklistManager:
      case View.ExamManager:
      case View.TrainingManager:
      case View.AccreditationManager:
      case View.NewsBannerManager:
      case View.PatientEducationManager:
      case View.HospitalCommunication:
        setSelectedDepartmentId(null);
        setCurrentView(View.DepartmentList);
        break;
      case View.AdminCommunication:
         setCurrentView(View.DepartmentList);
         break;
      case View.DepartmentList:
        setSelectedHospitalId(null);
        setAppScreen(AppScreen.HospitalList);
        break;
    }
  };
    
  const handleSaveData = () => {
    if (!hospitals || hospitals.length === 0) {
        alert("No data to save.");
        return;
    }
    try {
        const jsonString = JSON.stringify(hospitals, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        a.download = `my-hospital-backup-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Local backup saved successfully!');
    } catch (error) {
        console.error("Failed to save data:", error);
        alert('Failed to save data as a local backup file.');
    }
  };

  const handleLoadData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    if (Array.isArray(data) && (data.length === 0 || data.every(h => h.id && h.name))) {
                        if (window.confirm("Are you sure you want to overwrite current data with the backup file? This will not be saved to the online database automatically.")) {
                            setHospitals(data);
                            alert('Local backup loaded successfully. Remember, these changes are not yet saved to the database.');
                        }
                    } else {
                        throw new Error('Invalid backup file format.');
                    }
                } catch (error) {
                    console.error("Failed to load data:", error);
                    alert('Failed to load or parse the backup file.');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
  };
  
    // Placeholder for other handlers that need to be implemented
  const handleAddOrUpdateAssessment = () => console.log("Not implemented: handleAddOrUpdateAssessment");
  const handleUpdateAssessmentMessages = () => console.log("Not implemented: handleUpdateAssessmentMessages");
  const handleSubmitExam = () => console.log("Not implemented: handleSubmitExam");
  const handleAddOrUpdateChecklistTemplate = () => console.log("Not implemented: handleAddOrUpdateChecklistTemplate");
  const handleDeleteChecklistTemplate = () => console.log("Not implemented: handleDeleteChecklistTemplate");
  const handleAddOrUpdateExamTemplate = () => console.log("Not implemented: handleAddOrUpdateExamTemplate");
  const handleDeleteExamTemplate = () => console.log("Not implemented: handleDeleteExamTemplate");
  const handleAddStaff = () => console.log("Not implemented: handleAddStaff");
  const handleUpdateStaff = () => console.log("Not implemented: handleUpdateStaff");
  const handleDeleteStaff = () => console.log("Not implemented: handleDeleteStaff");
  const handleComprehensiveImport = () => console.log("Not implemented: handleComprehensiveImport");
  const handleAddOrUpdateWorkLog = () => console.log("Not implemented: handleAddOrUpdateWorkLog");
  const handleAddPatient = () => console.log("Not implemented: handleAddPatient");
  const handleDeletePatient = () => console.log("Not implemented: handleDeletePatient");

  // --- Render Logic ---
  const renderContent = () => {
    if (!isDataLoaded) {
       return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <svg className="animate-spin h-12 w-12 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-slate-500 dark:text-slate-400">در حال بارگذاری...</p>
          </div>
        </div>
      );
    }
    
    // Non-admin users are locked to their scope
    if (loggedInUser && loggedInUser.role !== UserRole.Admin) {
        const hospital = findHospital(loggedInUser.hospitalId!);
        if (!hospital) return <p>Error: Hospital not found for user.</p>;
        const department = findDepartment(hospital, loggedInUser.departmentId!);
        
        if (loggedInUser.role === UserRole.Patient) {
            const patient = department?.patients?.find(p => p.id === loggedInUser.patientId);
            if (!department || !patient) return <p>Error: Patient data not found.</p>;
            return <PatientPortalView 
              department={department} 
              patient={patient} 
              onSendMessage={(content) => handleSendChatMessage({ hospitalId: hospital.id, departmentId: department.id, patientId: patient.id }, content, 'patient')} 
            />
        }
        
        if (loggedInUser.role === UserRole.Staff) {
            const staffMember = findStaffMember(department, loggedInUser.staffId!);
            if (!department || !staffMember) return <p>Error: Staff member not found.</p>;
            return <StaffMemberView department={department} staffMember={staffMember} onBack={() => {}} onAddOrUpdateAssessment={handleAddOrUpdateAssessment} onUpdateAssessmentMessages={handleUpdateAssessmentMessages} onSubmitExam={handleSubmitExam} checklistTemplates={hospital.checklistTemplates || []} examTemplates={hospital.examTemplates || []} trainingMaterials={hospital.trainingMaterials || []} accreditationMaterials={hospital.accreditationMaterials || []} newsBanners={hospital.newsBanners || []} userRole={loggedInUser.role} />
        }

        if (loggedInUser.role === UserRole.Manager) {
            if (!department) return <p>Error: Department not found for manager.</p>;
            // ... render logic for manager
        }
        
        // Supervisor role
        if (loggedInUser.role === UserRole.Supervisor) {
             switch (currentView) {
                // ... render logic for supervisor
                default:
                  return <DepartmentList departments={hospital.departments} hospitalName={hospital.name} onAddDepartment={handleAddDepartment} onUpdateDepartment={handleUpdateDepartment} onDeleteDepartment={handleDeleteDepartment} onSelectDepartment={handleSelectDepartment} onBack={() => {}} onManageAccreditation={() => setCurrentView(View.AccreditationManager)} onManageNewsBanners={() => setCurrentView(View.NewsBannerManager)} onResetHospital={handleResetHospital} onContactAdmin={() => setCurrentView(View.HospitalCommunication)} userRole={loggedInUser.role} />;
            }
        }
    }
    
    // --- Admin rendering logic ---
    if (appScreen === AppScreen.HospitalList || !selectedHospitalId) {
        if (currentView === View.AdminCommunication) {
            return <AdminCommunicationView hospitals={hospitals} onSendMessage={(hospitalId, content) => handleSendChatMessage({ hospitalId }, content, 'admin')} onBack={() => setCurrentView(View.DepartmentList)} />;
        }
        return <HospitalList hospitals={hospitals} onAddHospital={handleAddHospital} onUpdateHospital={handleUpdateHospital} onDeleteHospital={handleDeleteHospital} onSelectHospital={handleSelectHospital} onGoToWelcome={handleGoToWelcome} userRole={loggedInUser?.role ?? UserRole.Admin} onContactAdmin={() => setCurrentView(View.AdminCommunication)} />;
    }

    const hospital = findHospital(selectedHospitalId);
    if (!hospital) return <p>Selected hospital not found.</p>;
    const department = findDepartment(hospital, selectedDepartmentId);
    const staffMember = findStaffMember(department, selectedStaffId);

    switch (currentView) {
      case View.DepartmentView:
        if (!department) return <p>Selected department not found.</p>;
        return <DepartmentView department={department} onBack={handleBack} onAddStaff={handleAddStaff} onUpdateStaff={handleUpdateStaff} onDeleteStaff={handleDeleteStaff} onSelectStaff={handleSelectStaff} onComprehensiveImport={handleComprehensiveImport} onManageChecklists={() => setCurrentView(View.ChecklistManager)} onManageExams={() => setCurrentView(View.ExamManager)} onManageTraining={() => setCurrentView(View.TrainingManager)} onManagePatientEducation={() => setCurrentView(View.PatientEducationManager)} onAddOrUpdateWorkLog={handleAddOrUpdateWorkLog} userRole={loggedInUser?.role ?? UserRole.Admin} newsBanners={hospital.newsBanners || []}/>;
      case View.StaffMemberView:
        if (!department || !staffMember) return <p>Selected staff member not found.</p>;
        return <StaffMemberView department={department} staffMember={staffMember} onBack={handleBack} onAddOrUpdateAssessment={handleAddOrUpdateAssessment} onUpdateAssessmentMessages={handleUpdateAssessmentMessages} onSubmitExam={handleSubmitExam} checklistTemplates={hospital.checklistTemplates || []} examTemplates={hospital.examTemplates || []} trainingMaterials={hospital.trainingMaterials || []} accreditationMaterials={hospital.accreditationMaterials || []} newsBanners={hospital.newsBanners || []} userRole={loggedInUser?.role ?? UserRole.Admin} />;
      case View.ChecklistManager:
        return <ChecklistManager templates={hospital.checklistTemplates || []} onAddOrUpdate={handleAddOrUpdateChecklistTemplate} onDelete={handleDeleteChecklistTemplate} onBack={handleBack} />;
      case View.ExamManager:
        return <ExamManager templates={hospital.examTemplates || []} onAddOrUpdate={handleAddOrUpdateExamTemplate} onDelete={handleDeleteExamTemplate} onBack={handleBack} />;
      case View.TrainingManager:
        return <TrainingManager monthlyTrainings={hospital.trainingMaterials || []} onAddMaterial={(month, file, description) => handleAddMaterial({name: file.name, type: file.type, description}, file, {hospitalId: hospital.id, month, type: 'monthly_staff'})} onDeleteMaterial={handleDeleteMaterial} onUpdateMaterialDescription={handleUpdateMaterialDescription} onBack={handleBack} />
      case View.AccreditationManager:
        return <AccreditationManager materials={hospital.accreditationMaterials || []} onAddMaterial={(file, description) => handleAddMaterial({name: file.name, type: file.type, description}, file, {hospitalId: hospital.id, type: 'accreditation'})} onDeleteMaterial={handleDeleteMaterial} onUpdateMaterialDescription={handleUpdateMaterialDescription} onBack={handleBack} />;
      case View.NewsBannerManager:
        return <NewsBannerManager banners={hospital.newsBanners || []} onAddBanner={handleAddNewsBanner} onUpdateBanner={handleUpdateNewsBanner} onDeleteBanner={handleDeleteNewsBanner} onBack={handleBack} />;
      case View.PatientEducationManager:
        if (!department) return <p>Selected department not found.</p>;
        return <PatientEducationManager 
          department={department} 
          onAddMaterial={(file, description) => handleAddMaterial({name: file.name, type: file.type, description}, file, {hospitalId: hospital.id, departmentId: department.id, type: 'patient_education'})} 
          onDeleteMaterial={handleDeleteMaterial} 
          onUpdateMaterialDescription={handleUpdateMaterialDescription} 
          onBack={handleBack} 
          onAddPatient={handleAddPatient} 
          onDeletePatient={handleDeletePatient} 
          onSendMessage={(patientId, content, sender) => handleSendChatMessage({ hospitalId: hospital.id, departmentId: department.id, patientId }, content, sender)} 
          />;
      case View.HospitalCommunication:
        return <HospitalCommunicationView hospital={hospital} onSendMessage={(content) => handleSendChatMessage({ hospitalId: hospital.id }, content, 'hospital')} onBack={handleBack} />;
      case View.DepartmentList:
      default:
        return <DepartmentList departments={hospital.departments} hospitalName={hospital.name} onAddDepartment={handleAddDepartment} onUpdateDepartment={handleUpdateDepartment} onDeleteDepartment={handleDeleteDepartment} onSelectDepartment={handleSelectDepartment} onBack={handleBack} onManageAccreditation={() => setCurrentView(View.AccreditationManager)} onManageNewsBanners={() => setCurrentView(View.NewsBannerManager)} onResetHospital={handleResetHospital} onContactAdmin={() => setCurrentView(View.HospitalCommunication)} userRole={loggedInUser?.role ?? UserRole.Admin} />;
    }
  };
  
  const renderApp = () => {
    if (initializationError) {
      return (
          <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-4">
              <div className="text-center max-w-2xl bg-white dark:bg-slate-800 p-8 rounded-lg shadow-2xl border border-red-500/30">
                  <h1 className="text-2xl font-bold text-red-500 mb-4">خطای پیکربندی برنامه</h1>
                  <p className="mb-2">اتصال به پایگاه داده برقرار نشد. به نظر می‌رسد متغیرهای محیطی لازم برای Supabase تنظیم نشده‌اند.</p>
                  <p className="mb-4">لطفاً مطمئن شوید که متغیرهای <code className="bg-slate-200 dark:bg-slate-700 p-1 rounded text-sm">NEXT_PUBLIC_SUPABASE_URL</code> و <code className="bg-slate-200 dark:bg-slate-700 p-1 rounded text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> را در تنظیمات پروژه Vercel خود به درستی وارد کرده‌اید.</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">پس از تنظیم این متغیرها، پروژه را مجدداً Deploy کنید.</p>
                  <pre className="mt-6 p-4 bg-slate-100 dark:bg-slate-800/50 rounded-md text-left text-xs text-red-400 overflow-x-auto">
                    {initializationError}
                  </pre>
              </div>
          </div>
      );
    }
    
    if (appScreen === AppScreen.Welcome) {
      return <WelcomeScreen onEnter={() => setIsLoginModalOpen(true)} />;
    }

    return (
        <div className="bg-slate-100 dark:bg-slate-900 min-h-screen flex flex-col">
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-4 shadow-md flex justify-between items-center sticky top-0 z-40 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    {appScreen === AppScreen.MainApp && (
                        <button
                            onClick={handleBack}
                            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="بازگشت"
                        >
                            <BackIcon className="w-6 h-6" />
                        </button>
                    )}
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">سامانه بیمارستان من</h1>
                </div>
                <div className="flex items-center gap-2">
                    {loggedInUser && (
                      <>
                        <button
                            onClick={handleSaveData}
                            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="ذخیره پشتیبان محلی"
                        >
                            <SaveIcon className="w-6 h-6" />
                        </button>
                        <button
                            onClick={handleLoadData}
                            className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            title="بارگذاری پشتیبان محلی"
                        >
                            <UploadIcon className="w-6 h-6" />
                        </button>
                      </>
                    )}
                    <button
                        onClick={() => setIsAboutModalOpen(true)}
                        className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="درباره برنامه"
                    >
                        <InfoIcon className="w-6 h-6" />
                    </button>

                    {loggedInUser ? (
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-300">
                                خوش آمدید, <span className="font-semibold">{loggedInUser.name}</span>
                            </span>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="خروج"
                            >
                                <LogoutIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsLoginModalOpen(true)}
                            className="px-4 py-2 text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                        >
                            ورود
                        </button>
                    )}
                </div>
            </header>
            <main className="flex-grow">{renderContent()}</main>
        </div>
    )
  };

  return (
    <>
      <Head>
        <title>Hospital Staff Skill Assessment</title>
      </Head>
      {renderApp()}
      <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLogin={handleLogin} loginError={loginError} />
    </>
  );
};

const NoSsrApp = dynamic(() => Promise.resolve(HomePage), { ssr: false });

export default NoSsrApp;