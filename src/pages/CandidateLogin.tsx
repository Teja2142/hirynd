import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Clock, XCircle } from "lucide-react";
import PasswordField from "@/components/auth/PasswordField";

const SOURCE_OPTIONS = ["LinkedIn", "Google", "University", "Friend", "Social Media", "Other"];
const VISA_OPTIONS = ["H1B", "OPT", "CPT", "Green Card", "US Citizen", "EAD", "TN", "Other"];

const CandidateLogin = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const { signIn, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Registration fields per spec Section 3.1
  const [reg, setReg] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    password: "", confirm_password: "",
    university_name: "", major_degree: "", graduation_date: "",
    how_did_you_hear: "", friend_name: "",
    linkedin_url: "", portfolio_url: "", visa_status: "", current_location: "",
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const updateReg = (field: string, value: string) => {
    setReg(prev => ({ ...prev, [field]: value }));
    setRegErrors(prev => ({ ...prev, [field]: "" }));
  };

  const validateRegistration = (): boolean => {
    const errors: Record<string, string> = {};
    if (!reg.first_name) errors.first_name = "First name is required";
    if (!reg.last_name) errors.last_name = "Last name is required";
    if (!reg.email) errors.email = "Email is required";
    if (!reg.phone) errors.phone = "Phone number is required";
    if (!reg.password || reg.password.length < 8) errors.password = "Password must be at least 8 characters";
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(reg.password))
      errors.password = "Must contain uppercase, lowercase, number, and special character";
    if (reg.password !== reg.confirm_password) errors.confirm_password = "Passwords do not match";
    if (!reg.university_name) errors.university_name = "University is required";
    if (!reg.major_degree) errors.major_degree = "Major/degree is required";
    if (!reg.graduation_date) errors.graduation_date = "Graduation date is required";
    if (!reg.how_did_you_hear) errors.how_did_you_hear = "This field is required";
    if (reg.how_did_you_hear === "Friend" && !reg.friend_name) errors.friend_name = "Friend name is required when source is Friend";
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setApprovalStatus(null);
    const { error, approval_status, user: loggedUser } = await signIn(loginEmail, loginPassword);
    
    if (error) {
      setSubmitting(false);
      if (approval_status === "pending") {
        setApprovalStatus("pending_approval");
      } else if (approval_status === "rejected") {
        setApprovalStatus("rejected");
      } else {
        const msg = typeof error === "string" ? error : (error.error || error.detail || "Invalid email or password.");
        toast({ title: "Login failed", description: msg, variant: "destructive" });
      }
    } else if (loggedUser?.role !== "candidate") {
      await signOut();
      setSubmitting(false);
      toast({ title: "Access denied", description: "This account is not registered as a candidate.", variant: "destructive" });
    } else {
      setSubmitting(false);
      navigate("/candidate-dashboard");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegistration()) return;
    setSubmitting(true);
    const { error } = await signUp(reg);
    setSubmitting(false);
    if (error) {
      let msg = "Something went wrong";
      if (typeof error === "string") {
        msg = error;
      } else {
        // Handle DRF validation error object
        const firstKey = Object.keys(error)[0];
        if (firstKey) {
          const firstErr = error[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        }
      }
      toast({ title: "Registration failed", description: msg, variant: "destructive" });
    } else {
      setRegistrationComplete(true);
    }
  };

  const { signUp: signUpRaw } = useAuth();
  const signUp = async (data: typeof reg) => {
    try {
      const { authApi } = await import("@/services/api");
      await authApi.register({
        email: data.email, password: data.password,
        first_name: data.first_name, last_name: data.last_name,
        phone: data.phone, role: "candidate",
        university_name: data.university_name, major_degree: data.major_degree,
        graduation_date: data.graduation_date, how_did_you_hear: data.how_did_you_hear,
        friend_name: data.friend_name, linkedin_url: data.linkedin_url,
        portfolio_url: data.portfolio_url, visa_status: data.visa_status,
        current_location: data.current_location,
      });
      return { error: null };
    } catch (err: any) {
      return { error: err.response?.data || err.message };
    }
  };

  if (registrationComplete || approvalStatus === "pending_approval") {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
          <div className="mx-auto w-full max-w-md bg-white p-10 rounded-2xl border border-neutral-200 shadow-xl animate-in text-center">
            <div className="relative mb-8 flex justify-center">
              <div className="relative h-16 w-16 bg-neutral-50 rounded-full flex items-center justify-center border border-neutral-100 shadow-sm">
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-neutral-900">Application Received</h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">Thank you for registering. Your profile has been received and is currently under strategic review.</p>
            <div className="bg-muted/30 rounded-2xl p-5 mb-8 border border-border/40 inline-block w-full text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Status: Review in progress</p>
              </div>
              <p className="text-sm text-foreground/80">Expected review time: <span className="font-bold text-secondary">24–48 hours</span></p>
              <p className="text-xs text-muted-foreground mt-2">Check your email for approval notifications.</p>
            </div>
            <Button variant="outline" className="h-11 rounded-xl px-8 hover:bg-secondary/5 transition-colors border-secondary/20" onClick={() => { setRegistrationComplete(false); setApprovalStatus(null); }}>
              {approvalStatus === "pending_approval" ? "Logout" : "Back to Login"}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
          <div className="mx-auto w-full max-w-md glass-card p-10 card-elevated text-center border-destructive/10 animate-in">
            <div className="relative mb-6 flex justify-center">
              <div className="absolute inset-0 bg-destructive/10 rounded-full blur-xl" />
              <div className="relative h-16 w-16 bg-card rounded-full flex items-center justify-center border border-destructive/20 shadow-lg">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="mb-3 text-2xl font-bold text-destructive">Review Finalized</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Your Hyrind account application was not approved at this time based on current criteria.
            </p>
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10 mb-8 text-sm">
              If you believe this decision was made in error or wish to appeal, please contact our support team.
            </div>
            <div className="flex flex-col gap-3">
              <Link to="/contact" className="inline-flex items-center justify-center h-11 rounded-xl bg-destructive text-white font-semibold shadow-lg shadow-destructive/20 hover:shadow-destructive/30 transition-all active:scale-[0.98]">
                Contact Support
              </Link>
              <Button variant="ghost" className="h-11 rounded-xl text-muted-foreground hover:text-foreground" onClick={() => setApprovalStatus(null)}>
                Back to Login
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <Header />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-4">
        <div className="mx-auto w-full max-w-lg bg-white rounded-2xl border border-neutral-200 p-10 shadow-xl shadow-neutral-100/50">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2 tracking-tight">Candidate Portal</h1>
            <p className="text-muted-foreground italic">"Focus on your skills, let us handle the rest"</p>
          </div>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-8 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
              <TabsTrigger value="login" className="rounded-lg py-2.5 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg py-2.5 transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-primary font-semibold">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0 animate-in" style={{animationDelay: '0.1s'}}>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-sm font-medium ml-1">Email</Label>
                  <Input 
                    id="login-email"
                    type="email" 
                    value={loginEmail} 
                    onChange={e => setLoginEmail(e.target.value)} 
                    placeholder="name@example.com"
                    className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                    required 
                  />
                </div>
                <PasswordField 
                  label="Password" 
                  value={loginPassword} 
                  onChange={setLoginPassword} 
                  show={showLoginPassword} 
                  onToggle={() => setShowLoginPassword(!showLoginPassword)} 
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="h-11 rounded-xl bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                />
                
                <div className="pt-2">
                  <Button variant="hero" className="w-full h-12 rounded-xl text-md font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all" disabled={submitting}>
                    {submitting ? "Signing in..." : "Sign In"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-0 animate-in" style={{animationDelay: '0.1s'}}>
              <form onSubmit={handleRegister} className="space-y-6 max-h-[55vh] overflow-y-auto pr-4 custom-scrollbar py-2">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Identity Info</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">First Name *</Label>
                      <Input 
                        value={reg.first_name} 
                        onChange={e => updateReg("first_name", e.target.value)} 
                        maxLength={60} 
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                      />
                      {regErrors.first_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.first_name}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium ml-1">Last Name *</Label>
                      <Input 
                        value={reg.last_name} 
                        onChange={e => updateReg("last_name", e.target.value)} 
                        maxLength={60} 
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                      />
                      {regErrors.last_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.last_name}</p>}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Email *</Label>
                    <Input 
                      type="email" 
                      value={reg.email} 
                      onChange={e => updateReg("email", e.target.value)} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                    />
                    {regErrors.email && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.email}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Phone Number *</Label>
                    <Input 
                      type="tel" 
                      value={reg.phone} 
                      onChange={e => updateReg("phone", e.target.value)} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                    />
                    {regErrors.phone && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.phone}</p>}
                  </div>
                  
                  <PasswordField 
                    label="Password *" 
                    value={reg.password} 
                    onChange={v => updateReg("password", v)} 
                    show={showRegPassword} 
                    onToggle={() => setShowRegPassword(!showRegPassword)} 
                    error={regErrors.password} 
                    className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                  />
                  
                  <PasswordField 
                    label="Confirm Password *" 
                    value={reg.confirm_password} 
                    onChange={v => updateReg("confirm_password", v)} 
                    show={showConfirmPassword} 
                    onToggle={() => setShowConfirmPassword(!showConfirmPassword)} 
                    error={regErrors.confirm_password} 
                    className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Education</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">University *</Label>
                    <Input 
                      value={reg.university_name} 
                      onChange={e => updateReg("university_name", e.target.value)} 
                      maxLength={120} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                    />
                    {regErrors.university_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.university_name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Major / Degree *</Label>
                    <Input 
                      value={reg.major_degree} 
                      onChange={e => updateReg("major_degree", e.target.value)} 
                      maxLength={120} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                    />
                    {regErrors.major_degree && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.major_degree}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Graduation Date *</Label>
                    <Input 
                      type="date" 
                      value={reg.graduation_date} 
                      onChange={e => updateReg("graduation_date", e.target.value)} 
                      className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                    />
                    {regErrors.graduation_date && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.graduation_date}</p>}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Discovery</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">How did you hear about us? *</Label>
                    <Select value={reg.how_did_you_hear} onValueChange={v => updateReg("how_did_you_hear", v)}>
                      <SelectTrigger className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"><SelectValue placeholder="Select source" /></SelectTrigger>
                      <SelectContent>{SOURCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                    {regErrors.how_did_you_hear && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.how_did_you_hear}</p>}
                  </div>
                  
                  {reg.how_did_you_hear === "Friend" && (
                    <div className="space-y-2 animate-in">
                      <Label className="text-sm font-medium ml-1">Friend's Name *</Label>
                      <Input 
                        value={reg.friend_name} 
                        onChange={e => updateReg("friend_name", e.target.value)} 
                        maxLength={120} 
                        className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all shadow-sm"
                      />
                      {regErrors.friend_name && <p className="text-[10px] text-destructive mt-1 font-medium ml-1">{regErrors.friend_name}</p>}
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-px bg-neutral-200 flex-grow" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-2">Extras (Optional)</span>
                    <div className="h-px bg-neutral-200 flex-grow" />
                  </div>
                  
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">LinkedIn URL</Label><Input type="url" value={reg.linkedin_url} onChange={e => updateReg("linkedin_url", e.target.value)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" /></div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Portfolio URL</Label><Input type="url" value={reg.portfolio_url} onChange={e => updateReg("portfolio_url", e.target.value)} className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" /></div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium ml-1">Visa Status</Label>
                    <Select value={reg.visa_status} onValueChange={v => updateReg("visa_status", v)}>
                      <SelectTrigger className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm"><SelectValue placeholder="Select visa type" /></SelectTrigger>
                      <SelectContent>{VISA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="text-sm font-medium ml-1">Current Location</Label><Input value={reg.current_location} onChange={e => updateReg("current_location", e.target.value)} placeholder="City, State, Country" className="h-10 rounded-lg bg-neutral-50 border-neutral-200 focus:bg-white transition-all shadow-sm" /></div>
                </div>

                <div className="pt-4 pb-2">
                  <Button variant="hero" className="w-full h-12 rounded-xl text-md font-semibold shadow-lg shadow-primary/10" disabled={submitting}>
                    {submitting ? "Registering..." : "Create Account"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-8 pt-6 border-t border-neutral-100 text-center">
            <p className="text-sm text-neutral-500">
              Need assistance? <Link to="/contact" className="font-semibold text-secondary hover:underline underline-offset-4 decoration-secondary/30">Contact Support Team</Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CandidateLogin;
