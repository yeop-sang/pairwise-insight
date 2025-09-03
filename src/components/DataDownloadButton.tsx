import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useDataDownload } from '@/hooks/useDataDownload';

interface DataDownloadButtonProps {
  projectId: string;
  variant?: 'default' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const DataDownloadButton: React.FC<DataDownloadButtonProps> = ({
  projectId,
  variant = 'outline',
  size = 'default',
  className
}) => {
  const { downloadProjectData } = useDataDownload();

  const handleDownload = () => {
    downloadProjectData(projectId);
  };

  return (
    <Button
      onClick={handleDownload}
      variant={variant}
      size={size}
      className={className}
    >
      <Download className="w-4 h-4 mr-2" />
      데이터 다운로드
    </Button>
  );
};