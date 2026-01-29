import { useState, useCallback, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  type: "csv" | "xlsx" | "pdf";
  size: string;
  status: "processing" | "completed" | "error";
  transactions?: number;
  uploadedAt: string;
}

interface StagedFile {
  file: File;
  id: string;
  name: string;
  type: "csv" | "xlsx" | "pdf";
  size: string;
}

const mockUploads: UploadedFile[] = [
  {
    id: "1",
    name: "chase_statement_jan.csv",
    type: "csv",
    size: "24 KB",
    status: "completed",
    transactions: 47,
    uploadedAt: "2024-01-15",
  },
  {
    id: "2",
    name: "amex_february.xlsx",
    type: "xlsx",
    size: "156 KB",
    status: "completed",
    transactions: 89,
    uploadedAt: "2024-02-01",
  },
];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileType = (file: File): "csv" | "xlsx" | "pdf" => {
  if (file.name.endsWith('.csv') || file.type === 'text/csv') return 'csv';
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) return 'xlsx';
  return 'pdf';
};

const FileIcon = ({ type }: { type: string }) => {
  if (type === "csv" || type === "xlsx") {
    return <FileSpreadsheet className="text-success" size={24} />;
  }
  return <FileText className="text-info" size={24} />;
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    completed: "bg-success/10 text-success border-success/20",
    processing: "bg-warning/10 text-warning border-warning/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const icons = {
    completed: <CheckCircle2 size={14} />,
    processing: <Clock size={14} className="animate-spin" />,
    error: <AlertCircle size={14} />,
  };

  return (
    <Badge
      variant="outline"
      className={cn("flex items-center gap-1.5", styles[status as keyof typeof styles])}
    >
      {icons[status as keyof typeof icons]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

export default function Uploads() {
  const [uploads, setUploads] = useState<UploadedFile[]>(mockUploads);
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/pdf'];
    const validFiles = files.filter(file => 
      validTypes.includes(file.type) || 
      file.name.endsWith('.csv') || 
      file.name.endsWith('.xlsx') || 
      file.name.endsWith('.xls') || 
      file.name.endsWith('.pdf')
    );

    if (validFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload CSV, XLSX, or PDF files only.",
        variant: "destructive",
      });
      return;
    }

    const newStagedFiles: StagedFile[] = validFiles.map(file => ({
      file,
      id: `staged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      type: getFileType(file),
      size: formatFileSize(file.size),
    }));

    setStagedFiles(prev => [...prev, ...newStagedFiles]);
    
    toast({
      title: "Files added",
      description: `${validFiles.length} file(s) ready for upload. Click "Upload Files" to proceed.`,
    });
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
      // Reset input so same file can be selected again
      e.target.value = '';
    }
  }, [handleFiles]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const removeStagedFile = useCallback((id: string) => {
    setStagedFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleUpload = useCallback(async () => {
    if (stagedFiles.length === 0) return;

    setIsUploading(true);

    // Simulate upload processing
    for (const staged of stagedFiles) {
      const newUpload: UploadedFile = {
        id: staged.id,
        name: staged.name,
        type: staged.type,
        size: staged.size,
        status: "processing",
        uploadedAt: new Date().toISOString().split('T')[0],
      };
      
      setUploads(prev => [newUpload, ...prev]);
    }

    // Clear staged files
    setStagedFiles([]);

    toast({
      title: "Upload started",
      description: `Processing ${stagedFiles.length} file(s). This may take a moment.`,
    });

    // Simulate processing completion after delay
    setTimeout(() => {
      setUploads(prev => 
        prev.map(u => 
          u.status === "processing" 
            ? { ...u, status: "completed" as const, transactions: Math.floor(Math.random() * 100) + 10 }
            : u
        )
      );
      toast({
        title: "Upload complete",
        description: "All files have been processed successfully.",
      });
    }, 3000);

    setIsUploading(false);
  }, [stagedFiles, toast]);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Uploads"
        description="Upload your bank statements and credit card exports"
      />

      {/* Upload Dropzone */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div
            className={cn("dropzone", isDragging && "dropzone-active")}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-accent/10">
                <Upload className="text-accent" size={32} />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  Drop your files here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse. Supports CSV, XLSX, and PDF files.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button className="mt-2" onClick={handleButtonClick}>
                <Plus size={18} className="mr-2" />
                Select Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staged Files - Ready for Upload */}
      {stagedFiles.length > 0 && (
        <Card className="mb-6 border-accent/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold">
                Ready for Upload ({stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''})
              </CardTitle>
              <Button 
                onClick={handleUpload} 
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    Upload Files
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stagedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/5 border border-accent/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-card">
                      <FileIcon type={file.type} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.size}</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground hover:text-destructive h-8 w-8"
                    onClick={() => removeStagedFile(file.id)}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Upload History</CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-50" />
              <p>No uploads yet. Start by uploading your first statement!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-card">
                      <FileIcon type={file.type} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span>{file.uploadedAt}</span>
                        {file.transactions && (
                          <>
                            <span>•</span>
                            <span>{file.transactions} transactions</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={file.status} />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeUpload(file.id)}
                    >
                      <X size={18} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}