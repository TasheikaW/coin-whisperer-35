import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Bell, Shield, CreditCard, Trash2 } from "lucide-react";

export function DemoSettings() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences" />

      <div className="space-y-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User size={20} className="text-muted-foreground" />
              <div><CardTitle className="text-lg">Profile</CardTitle><CardDescription>Your personal information</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input value="Jane" disabled /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input value="Doe" disabled /></div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value="jane.doe@example.com" disabled className="bg-muted" />
            </div>
            <Button disabled>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-muted-foreground" />
              <div><CardTitle className="text-lg">Notifications</CardTitle><CardDescription>How we keep you informed</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-foreground">Email Notifications</p><p className="text-sm text-muted-foreground">Receive updates about your account</p></div>
              <Switch checked disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-foreground">Budget Alerts</p><p className="text-sm text-muted-foreground">Get notified when approaching budget limits</p></div>
              <Switch checked disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-foreground">Weekly Digest</p><p className="text-sm text-muted-foreground">Summary of your spending every week</p></div>
              <Switch disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard size={20} className="text-muted-foreground" />
              <div><CardTitle className="text-lg">Preferences</CardTitle><CardDescription>Customize your experience</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value="USD" disabled><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USD">USD ($)</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value="mdy" disabled><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mdy">MM/DD/YYYY</SelectItem></SelectContent></Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-muted-foreground" />
              <div><CardTitle className="text-lg">Security</CardTitle><CardDescription>Keep your account safe</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent><Button variant="outline" disabled>Change Password</Button></CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-destructive" />
              <div><CardTitle className="text-lg text-destructive">Danger Zone</CardTitle><CardDescription>Irreversible actions</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-foreground">Delete Account</p>
            <p className="text-sm text-muted-foreground mb-3">Permanently delete your account and all associated data</p>
            <Button variant="destructive" disabled>Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
