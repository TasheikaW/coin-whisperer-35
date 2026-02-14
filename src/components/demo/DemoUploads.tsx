import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, FileText, CheckCircle2, Plus } from "lucide-react";

const uploads = [
  { id: "1", filename: "chase_checking_jan2025.csv", type: "csv", size: 12400, date: "2025-01-15", status: "completed", count: 47 },
  { id: "2", filename: "amex_statement_dec2024.pdf", type: "pdf", size: 89200, date: "2025-01-02", status: "completed", count: 31 },
  { id: "3", filename: "bofa_savings_q4.xlsx", type: "xlsx", size: 34500, date: "2024-12-20", status: "completed", count: 18 },
];

export function DemoUploads() {
  return (
    <>
      <PageHeader title="Uploads" description="Upload your bank statements and credit card exports" />

      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="dropzone">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-accent/10">
                <Upload className="text-accent" size={32} />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Drop your files here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse. Supports CSV, XLSX, and PDF files.</p>
              </div>
              <Button className="mt-2" disabled><Plus size={18} className="mr-2" />Select Files</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg font-semibold">Upload History</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {uploads.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-card">
                    {file.type === "pdf" ? <FileText className="text-info" size={24} /> : <FileSpreadsheet className="text-success" size={24} />}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{file.filename}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span>{(file.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{new Date(file.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{file.count} transactions</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-success/10 text-success border-success/20 flex items-center gap-1.5">
                  <CheckCircle2 size={14} />Completed
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
