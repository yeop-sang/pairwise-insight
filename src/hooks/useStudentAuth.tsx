import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Student {
  id: string;
  student_id: string;
  name: string;
  grade: number;
  class_number: number;
  student_number: number;
  teacher_id: string;
}

interface StudentAuthContextType {
  student: Student | null;
  login: (studentId: string, password: string) => Promise<{ error: string | null }>;
  logout: () => void;
  loading: boolean;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

export const StudentAuthProvider = ({ children }: { children: ReactNode }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 세션 복원: localStorage에서 학생 정보 확인
    const savedStudent = localStorage.getItem('student_session');
    if (savedStudent) {
      try {
        setStudent(JSON.parse(savedStudent));
      } catch (error) {
        localStorage.removeItem('student_session');
      }
    }
    setLoading(false);
  }, []);

  const login = async (studentId: string, password: string) => {
    try {
      const { data: studentData, error } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', studentId)
        .eq('password', password)
        .single();

      if (error || !studentData) {
        return { error: '학생 ID 또는 비밀번호가 올바르지 않습니다.' };
      }

      const student = {
        id: studentData.id,
        student_id: studentData.student_id,
        name: studentData.name,
        grade: studentData.grade,
        class_number: studentData.class_number,
        student_number: studentData.student_number,
        teacher_id: studentData.teacher_id,
      };

      setStudent(student);
      localStorage.setItem('student_session', JSON.stringify(student));

      return { error: null };
    } catch (error) {
      return { error: '로그인 중 오류가 발생했습니다.' };
    }
  };

  const logout = () => {
    setStudent(null);
    localStorage.removeItem('student_session');
  };

  return (
    <StudentAuthContext.Provider value={{ student, login, logout, loading }}>
      {children}
    </StudentAuthContext.Provider>
  );
};

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
};