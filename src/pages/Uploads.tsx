import { useState, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedFile {
  id: string;
  name: string;
  type: "csv" | "xlsx" | "pdf";
  size: string;
  status: "processing" | "completed" | "error";
  transactions?: number;
  uploadedAt: string;
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
  {
    id: "3",
    name: "bank_statement.pdf",
    type: "pdf",
    size: "1.2 MB",
    status: "processing",
    uploadedAt: "2024-02-10",
  },
];

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
  const [uploads] = useState<UploadedFile[]>(mockUploads);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file upload
    const files = Array.from(e.dataTransfer.files);
    console.log("Dropped files:", files);
  }, []);

  return (
    <AppLayout>
      <PageHeader
        title="Uploads"
        description="Upload your bank statements and credit card exports"
      />

      {/* Upload Dropzone */}
      <Card className="mb-8">
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
              <Button className="mt-2">
                <Plus size={18} className="mr-2" />
                Select Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
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
