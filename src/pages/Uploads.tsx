import { useEffect, useCallback, useRef } from "react";
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
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUploads } from "@/hooks/useUploads";

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
  const {
    uploads,
    stagedFiles,
    isLoading,
    isUploading,
    fetchUploads,
    addStagedFiles,
    removeStagedFile,
    processUpload,
    deleteUpload,
    viewUploadTransactions,
  } = useUploads();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    addStagedFiles(files);
  }, [addStagedFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addStagedFiles(files);
      e.target.value = '';
    }
  }, [addStagedFiles]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
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
            className="dropzone"
            onDragOver={handleDragOver}
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
                onClick={processUpload} 
                disabled={isUploading}
                className="gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processing...
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-muted-foreground" size={32} />
            </div>
          ) : uploads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileSpreadsheet size={48} className="mx-auto mb-4 opacity-50" />
              <p>No uploads yet. Start by uploading your first statement!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => viewUploadTransactions(file.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-card">
                      <FileIcon type={file.file_type} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{file.filename}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span>{file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : '-'}</span>
                        <span>•</span>
                        <span>{new Date(file.upload_date).toLocaleDateString()}</span>
                        {file.transactions_count !== null && file.transactions_count > 0 && (
                          <>
                            <span>•</span>
                            <span>{file.transactions_count} transactions</span>
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
                      className="text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        viewUploadTransactions(file.id);
                      }}
                    >
                      <Eye size={18} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteUpload(file.id);
                      }}
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
