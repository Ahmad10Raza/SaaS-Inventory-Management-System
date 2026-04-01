import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Package, Loader2, Building2, UserPlus, Settings2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';

// ─── Validation Schema ───────────────────────────────────
const registerSchema = z.object({
  // Step 1 — Company Info
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  industry: z.string().min(1, 'Please select an industry'),
  businessType: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
  warehouseCount: z.coerce.number().min(1).optional(),
  employeeCount: z.coerce.number().min(1).optional(),
  expectedProductCount: z.coerce.number().min(1).optional(),
  // Step 2 — Feature Preferences (all optional toggles)
  batchTracking: z.boolean().optional(),
  serialTracking: z.boolean().optional(),
  expiryTracking: z.boolean().optional(),
  manufacturingModule: z.boolean().optional(),
  warehouseTransfers: z.boolean().optional(),
  approvalWorkflow: z.boolean().optional(),
  // Step 3 — Account
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Industry Options ────────────────────────────────────
const industries = [
  { value: 'electronics_store', label: '📱 Electronics Store' },
  { value: 'clothing_store', label: '👗 Clothing Store' },
  { value: 'pharmacy', label: '💊 Pharmacy' },
  { value: 'grocery_store', label: '🛒 Grocery Store' },
  { value: 'iron_factory', label: '🏭 Iron Factory' },
  { value: 'plastic_factory', label: '🏭 Plastic Factory' },
  { value: 'warehouse', label: '🏢 Warehouse' },
  { value: 'retail_store', label: '🏪 Retail Store' },
  { value: 'distributor', label: '🚛 Distributor' },
  { value: 'wholesale', label: '📦 Wholesale' },
  { value: 'fmcg', label: '🛒 FMCG' },
  { value: 'manufacturing', label: '⚙️ Manufacturing' },
  { value: 'other', label: '🏢 Other' },
];

const businessTypes = [
  { value: 'b2b', label: 'B2B (Business-to-Business)' },
  { value: 'b2c', label: 'B2C (Business-to-Consumer)' },
  { value: 'b2b2c', label: 'B2B2C (Hybrid)' },
  { value: 'd2c', label: 'D2C (Direct-to-Consumer)' },
  { value: 'marketplace', label: 'Marketplace' },
  { value: 'other', label: 'Other' },
];

const currencies = [
  { value: 'INR', label: '₹ INR (Indian Rupee)' },
  { value: 'USD', label: '$ USD (US Dollar)' },
  { value: 'EUR', label: '€ EUR (Euro)' },
  { value: 'GBP', label: '£ GBP (British Pound)' },
  { value: 'AED', label: 'AED (UAE Dirham)' },
  { value: 'SAR', label: 'SAR (Saudi Riyal)' },
];

// ─── Industry-specific default toggles ───────────────────
const INDUSTRY_FEATURE_DEFAULTS: Record<string, Partial<RegisterFormData>> = {
  electronics_store: { serialTracking: true, batchTracking: false, expiryTracking: false, manufacturingModule: false },
  clothing_store: { serialTracking: false, batchTracking: false, expiryTracking: false, manufacturingModule: false },
  pharmacy: { batchTracking: true, expiryTracking: true, serialTracking: false, manufacturingModule: false },
  grocery_store: { batchTracking: true, expiryTracking: true, serialTracking: false, manufacturingModule: false },
  iron_factory: { manufacturingModule: true, warehouseTransfers: true, batchTracking: true, approvalWorkflow: true },
  plastic_factory: { manufacturingModule: true, warehouseTransfers: true, batchTracking: true },
  manufacturing: { manufacturingModule: true, warehouseTransfers: true, approvalWorkflow: true },
  warehouse: { warehouseTransfers: true },
  distributor: { warehouseTransfers: true },
  fmcg: { batchTracking: true, expiryTracking: true },
};

// ─── Toggle Component ────────────────────────────────────
function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description: string }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/40 bg-card cursor-pointer transition-all group">
      <div className="relative mt-0.5">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-9 h-5 bg-muted rounded-full peer-checked:bg-primary transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium group-hover:text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}

// ─── Main Component ──────────────────────────────────────
export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    setValue,
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      businessType: 'other',
      country: 'India',
      currency: 'INR',
      warehouseCount: 1,
      employeeCount: 1,
      expectedProductCount: 100,
      batchTracking: false,
      serialTracking: false,
      expiryTracking: false,
      manufacturingModule: false,
      warehouseTransfers: false,
      approvalWorkflow: false,
    },
  });

  const watchedIndustry = watch('industry');

  const handleStep1Next = async () => {
    const isValid = await trigger(['companyName', 'industry']);
    if (isValid) {
      // Pre-fill Step 2 toggles based on industry
      const defaults = INDUSTRY_FEATURE_DEFAULTS[getValues('industry')] || {};
      Object.entries(defaults).forEach(([key, value]) => {
        setValue(key as any, value);
      });
      setStep(2);
    }
  };

  const handleStep2Next = () => setStep(3);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        companyName: data.companyName,
        industry: data.industry,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        businessType: data.businessType,
        country: data.country,
        currency: data.currency,
        warehouseCount: data.warehouseCount,
        employeeCount: data.employeeCount,
        expectedProductCount: data.expectedProductCount,
        featurePreferences: {
          batchTracking: data.batchTracking,
          serialTracking: data.serialTracking,
          expiryTracking: data.expiryTracking,
          manufacturingModule: data.manufacturingModule,
          warehouseTransfers: data.warehouseTransfers,
          approvalWorkflow: data.approvalWorkflow,
        },
      });
      navigate('/dashboard');
    } catch {
      // Error handled by store
    }
  };

  const stepLabels = [
    { icon: Building2, label: 'Company' },
    { icon: Settings2, label: 'Features' },
    { icon: UserPlus, label: 'Account' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative animate-fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">InventoryPro</h1>
              <p className="text-xs text-muted-foreground">SaaS Platform</p>
            </div>
          </div>
        </div>

        <Card className="glass border-white/30 dark:border-gray-700/50 shadow-2xl shadow-primary/5">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
            <CardDescription>Start your 14-day free trial. No credit card required.</CardDescription>
            {/* 3-step indicator */}
            <div className="flex items-center justify-center gap-1 pt-3">
              {stepLabels.map((s, i) => (
                <div key={i} className="flex items-center">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${step === i + 1 ? 'bg-primary text-primary-foreground' : step > i + 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <s.icon className="w-3 h-3" />
                    {s.label}
                  </div>
                  {i < 2 && <ChevronRight className="w-3 h-3 mx-1 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
                  {error}
                  <button type="button" onClick={clearError} className="float-right">×</button>
                </div>
              )}

              {/* ═══════════════ STEP 1: Company Info ═══════════════ */}
              {step === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input id="companyName" placeholder="My Awesome Business" {...register('companyName')} className={errors.companyName ? 'border-destructive' : ''} />
                    {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry Type *</Label>
                      <select id="industry" {...register('industry')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <option value="">Select industry</option>
                        {industries.map((ind) => <option key={ind.value} value={ind.value}>{ind.label}</option>)}
                      </select>
                      {errors.industry && <p className="text-xs text-destructive">{errors.industry.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <select id="businessType" {...register('businessType')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {businessTypes.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" placeholder="India" {...register('country')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <select id="currency" {...register('currency')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {currencies.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="warehouseCount">Warehouses</Label>
                      <Input id="warehouseCount" type="number" min={1} {...register('warehouseCount')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeCount">Employees</Label>
                      <Input id="employeeCount" type="number" min={1} {...register('employeeCount')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expectedProductCount">Products</Label>
                      <Input id="expectedProductCount" type="number" min={1} {...register('expectedProductCount')} />
                    </div>
                  </div>

                  <Button type="button" className="w-full" onClick={handleStep1Next}>
                    Continue to Features <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}

              {/* ═══════════════ STEP 2: Feature Preferences ═══════════════ */}
              {step === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <p className="text-sm text-muted-foreground text-center">
                    We've pre-configured these based on your industry. Toggle to customize.
                  </p>

                  <div className="space-y-2">
                    <Toggle
                      checked={!!watch('batchTracking')}
                      onChange={(v) => setValue('batchTracking', v)}
                      label="Batch Tracking"
                      description="Track products by batch or lot number"
                    />
                    <Toggle
                      checked={!!watch('serialTracking')}
                      onChange={(v) => setValue('serialTracking', v)}
                      label="Serial Number Tracking"
                      description="Track individual items by serial number or IMEI"
                    />
                    <Toggle
                      checked={!!watch('expiryTracking')}
                      onChange={(v) => setValue('expiryTracking', v)}
                      label="Expiry Date Tracking"
                      description="Monitor product expiration dates and get alerts"
                    />
                    <Toggle
                      checked={!!watch('manufacturingModule')}
                      onChange={(v) => setValue('manufacturingModule', v)}
                      label="Manufacturing / BOM"
                      description="Bill of Materials, production tracking, raw materials"
                    />
                    <Toggle
                      checked={!!watch('warehouseTransfers')}
                      onChange={(v) => setValue('warehouseTransfers', v)}
                      label="Multi-Warehouse Transfers"
                      description="Transfer stock between multiple warehouse locations"
                    />
                    <Toggle
                      checked={!!watch('approvalWorkflow')}
                      onChange={(v) => setValue('approvalWorkflow', v)}
                      label="Approval Workflows"
                      description="Require manager approval for purchases and adjustments"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                      Back
                    </Button>
                    <Button type="button" className="flex-1" onClick={handleStep2Next}>
                      Continue to Account <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ═══════════════ STEP 3: Account Details ═══════════════ */}
              {step === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" placeholder="John" {...register('firstName')} className={errors.firstName ? 'border-destructive' : ''} />
                      {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" placeholder="Doe" {...register('lastName')} className={errors.lastName ? 'border-destructive' : ''} />
                      {errors.lastName && <p className="text-xs text-destructive">{errors.lastName.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@company.com" {...register('email')} className={errors.email ? 'border-destructive' : ''} />
                    {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" placeholder="+91 9876543210" {...register('phone')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...register('password')}
                        className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input id="confirmPassword" type="password" placeholder="••••••••" {...register('confirmPassword')} className={errors.confirmPassword ? 'border-destructive' : ''} />
                    {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                      Back
                    </Button>
                    <Button type="submit" className="flex-1" disabled={isLoading}>
                      {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : 'Create Account'}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:text-primary/80 transition-colors">Sign in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
