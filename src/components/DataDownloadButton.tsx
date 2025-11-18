import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useDataDownload } from '@/hooks/useDataDownload';

interface DataDownloadButtonProps {
  projectId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  mode?: 'full' | 'csv'; // 'full' = ZIP with all data, 'csv' = CSV only
}

export const DataDownloadButton: React.FC<DataDownloadButtonProps> = ({
  projectId,
  variant = 'outline',
  size = 'default',
  className,
  mode = 'full'
}) => {
  const { downloadProjectData, downloadStudentResponsesCSV } = useDataDownload();

  const handleDownload = () => {
    if (mode === 'csv') {
      downloadStudentResponsesCSV(projectId);
    } else {
      downloadProjectData(projectId);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      variant={variant}
      size={size}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      {mode === 'csv' ? '응답 CSV 다운로드' : '데이터 다운로드'}
    </Button>
  );
};