-- Create user role enum
CREATE TYPE public.user_role AS ENUM ('teacher', 'student');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  question TEXT NOT NULL,
  rubric TEXT,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for projects
CREATE POLICY "Teachers can manage their own projects" 
ON public.projects 
FOR ALL 
USING (auth.uid() = teacher_id);

CREATE POLICY "Students can view active projects" 
ON public.projects 
FOR SELECT 
USING (is_active = true);

-- Create student responses table
CREATE TABLE public.student_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_code TEXT NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, student_code)
);

-- Enable RLS on student responses
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for student responses
CREATE POLICY "Teachers can manage responses for their projects" 
ON public.student_responses 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE id = project_id AND teacher_id = auth.uid()
));

CREATE POLICY "Students can view responses for active projects" 
ON public.student_responses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE id = project_id AND is_active = true
));

-- Create comparisons table for storing comparison results
CREATE TABLE public.comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_a_id UUID NOT NULL REFERENCES public.student_responses(id) ON DELETE CASCADE,
  response_b_id UUID NOT NULL REFERENCES public.student_responses(id) ON DELETE CASCADE,
  decision TEXT CHECK (decision IN ('left', 'right', 'neutral', 'skip')),
  comparison_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on comparisons
ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;

-- Create policies for comparisons
CREATE POLICY "Students can manage their own comparisons" 
ON public.comparisons 
FOR ALL 
USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view comparisons for their projects" 
ON public.comparisons 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE id = project_id AND teacher_id = auth.uid()
));

-- Create project assignments table
CREATE TABLE public.project_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, student_id)
);

-- Enable RLS on project assignments
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for project assignments
CREATE POLICY "Teachers can manage assignments for their projects" 
ON public.project_assignments 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.projects 
  WHERE id = project_id AND teacher_id = auth.uid()
));

CREATE POLICY "Students can view their own assignments" 
ON public.project_assignments 
FOR SELECT 
USING (auth.uid() = student_id);

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'User'),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_responses_updated_at
  BEFORE UPDATE ON public.student_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();