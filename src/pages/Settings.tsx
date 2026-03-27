import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Bell, Shield, CreditCard, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const profileSchema = z.object({
  first_name: z.string().trim().max(100, "First name must be less than 100 characters").nullable(),
  last_name: z.string().trim().max(100, "Last name must be less than 100 characters").nullable(),
});

export default function Settings() {
  const { user } = useAuth();
  const { } = (await import("@/hooks/useAuth")).useRequireAuth ? {} : {};

  const { toast } = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [dateFormat, setDateFormat] = useState("mdy");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Load profile on mount
  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data && !error) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setEmail(data.email || user.email || "");
        setEmailNotifications(data.email_notifications ?? true);
        setBudgetAlerts(data.budget_alerts ?? true);
        setWeeklyDigest(data.weekly_digest ?? false);
        setCurrency(data.default_currency || "USD");
        setDateFormat(data.date_format || "mdy");
      } else {
        setEmail(user.email || "");
      }
      setLoading(false);
    };
    loadProfile();
  }, [user]);

  const saveProfile = async () => {
    if (!user) return;
    const parsed = profileSchema.safeParse({ first_name: firstName || null, last_name: lastName || null });
    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.errors[0]?.message, variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: parsed.data.first_name, last_name: parsed.data.last_name })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
    }
  };

  const saveNotifications = async () => {
    if (!user) return;
    setSavingNotifications(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email_notifications: emailNotifications, budget_alerts: budgetAlerts, weekly_digest: weeklyDigest })
      .eq("user_id", user.id);
    setSavingNotifications(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save notification preferences.", variant: "destructive" });
    } else {
      toast({ title: "Notification preferences saved" });
    }
  };

  const savePreferences = async () => {
    if (!user) return;
    setSavingPreferences(true);
    const { error } = await supabase
      .from("profiles")
      .update({ default_currency: currency, date_format: dateFormat })
      .eq("user_id", user.id);
    setSavingPreferences(false);
    if (error) {
      toast({ title: "Error", description: "Failed to save preferences.", variant: "destructive" });
    } else {
      toast({ title: "Preferences saved" });
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email);
    if (error) {
      toast({ title: "Error", description: "Failed to send password reset email.", variant: "destructive" });
    } else {
      toast({ title: "Password reset email sent", description: "Check your inbox for the reset link." });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <PageHeader title="Settings" description="Manage your account and preferences" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
      />

      <div className="space-y-8 max-w-2xl">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <User size={20} className="text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Profile</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
            </div>
            <Button onClick={saveProfile} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription>How we keep you informed</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive updates about your account</p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Budget Alerts</p>
                <p className="text-sm text-muted-foreground">Get notified when approaching budget limits</p>
              </div>
              <Switch checked={budgetAlerts} onCheckedChange={setBudgetAlerts} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Weekly Digest</p>
                <p className="text-sm text-muted-foreground">Summary of your spending every week</p>
              </div>
              <Switch checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
            </div>
            <div className="pt-2">
              <Button onClick={saveNotifications} disabled={savingNotifications}>
                {savingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Notifications
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard size={20} className="text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                  <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                  <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={savePreferences} disabled={savingPreferences}>
              {savingPreferences && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Preferences
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Shield size={20} className="text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">Security</CardTitle>
                <CardDescription>Keep your account safe</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={handleChangePassword}>Change Password</Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trash2 size={20} className="text-destructive" />
              <div>
                <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-foreground">Delete Account</p>
              <p className="text-sm text-muted-foreground mb-3">
                Permanently delete your account and all associated data
              </p>
              <Button variant="destructive" disabled>Delete Account</Button>
              <p className="text-xs text-muted-foreground mt-1">Contact support to delete your account.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
