-- Update existing student passwords to new 5-digit format
-- Format: grade(1) + class(2) + number(2) = 5 digits
UPDATE students
SET password = LPAD(grade::text, 1, '0') || LPAD(class_number::text, 2, '0') || LPAD(student_number::text, 2, '0')
WHERE LENGTH(password) != 5 OR password !~ '^[0-9]{5}$';