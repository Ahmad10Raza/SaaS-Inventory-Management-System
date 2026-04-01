import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus, Save, Building2, Users, Palette, Trash2, X, Loader2,
  Package, Receipt, Warehouse, ShieldCheck, Bell, Paintbrush, Factory,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from '@/components/ui/tooltip';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';

// ─── Types ───────────────────────────────────────────────
type TabKey = 'profile' | 'users' | 'inventory' | 'products' | 'tax' | 'warehouse' | 'approvals' | 'notifications' | 'branding';

interface TabDef {
  key: TabKey;
  label: string;
  icon: any;
}

const TABS: TabDef[] = [
  { key: 'profile', label: 'Company', icon: Building2 },
  { key: 'users', label: 'Staff', icon: Users },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'products', label: 'Products', icon: Factory },
  { key: 'tax', label: 'Tax & Billing', icon: Receipt },
  { key: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { key: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'branding', label: 'Branding', icon: Paintbrush },
];

const ROLES = [
  { value: 'company_owner', label: 'Company Owner (Full Access)' },
  { value: 'super_admin', label: 'Super Admin (System Owner)' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'sales_manager', label: 'Sales Manager' },
  { value: 'purchase_manager', label: 'Purchase Manager' },
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
  { value: 'accountant', label: 'Accountant' },
  { value: 'staff', label: 'General Staff' },
  { value: 'read_only', label: 'Read-Only Viewer' },
];

// ─── Reusable Toggle Switch ──────────────────────────────
function SettingsToggle({ label, description, checked, onChange, disabled }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 p-3.5 rounded-lg border border-border hover:border-primary/30 bg-card/50 cursor-pointer transition-all group ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="relative mt-0.5 flex-shrink-0">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" disabled={disabled} />
        <div className="w-10 h-[22px] bg-muted rounded-full peer-checked:bg-primary transition-colors" />
        <div className="absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow peer-checked:translate-x-[18px] transition-transform" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </label>
  );
}

// ─── Generic Settings Tab Component ──────────────────────
function SettingsTab({ endpoint, title, description, fields }: {
  endpoint: string;
  title: string;
  description: string;
  fields: { key: string; label: string; description?: string; type: 'toggle' | 'text' | 'number' | 'color' }[];
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings', endpoint],
    queryFn: () => api.get(`/settings/${endpoint}`).then(r => r.data),
    staleTime: 0,
  });

  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (data && !isDirty) {
      const clean: Record<string, any> = {};
      fields.forEach(f => { clean[f.key] = data[f.key]; });
      setFormData(clean);
    }
  }, [data, isDirty, fields]);

  const mutation = useMutation({
    mutationFn: (d: any) => api.put(`/settings/${endpoint}`, d),
    onSuccess: () => {
      toast.success(`${title} saved!`);
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['settings', endpoint] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <Card className="animate-fade-in">
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {fields.map(f => {
            if (f.type === 'toggle') {
              return (
                <SettingsToggle
                  key={f.key}
                  label={f.label}
                  description={f.description}
                  checked={!!formData[f.key]}
                  onChange={(v) => handleChange(f.key, v)}
                />
              );
            }
            return (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type={f.type === 'color' ? 'color' : f.type === 'number' ? 'number' : 'text'}
                  value={formData[f.key] ?? ''}
                  onChange={(e) => handleChange(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                  className={f.type === 'color' ? 'w-20 h-10 p-1 cursor-pointer' : ''}
                />
                {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
              </div>
            );
          })}
        </div>
        <div className="pt-5 flex justify-end">
          <Button onClick={() => mutation.mutate(formData)} disabled={mutation.isPending || !isDirty} className="gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Field Definitions ───────────────────────────────────
const INVENTORY_FIELDS = [
  { key: 'multiWarehouseEnabled', label: 'Multi-Warehouse Support', description: 'Enable managing inventory across multiple warehouse locations', type: 'toggle' as const },
  { key: 'negativeStockAllowed', label: 'Allow Negative Stock', description: 'Allow stock quantities to go below zero', type: 'toggle' as const },
  { key: 'autoReorderEnabled', label: 'Automatic Reorder Suggestions', description: 'Get suggestions when stock falls below threshold', type: 'toggle' as const },
  { key: 'reorderThresholdDefault', label: 'Default Reorder Threshold', description: 'Minimum quantity before triggering reorder alerts', type: 'number' as const },
  { key: 'stockReservationEnabled', label: 'Stock Reservation', description: 'Reserve stock for pending sales orders', type: 'toggle' as const },
  { key: 'batchTrackingEnabled', label: 'Batch / Lot Tracking', description: 'Track products by batch or lot number', type: 'toggle' as const },
  { key: 'serialTrackingEnabled', label: 'Serial Number Tracking', description: 'Track individual items by unique serial numbers', type: 'toggle' as const },
  { key: 'expiryTrackingEnabled', label: 'Expiry Date Tracking', description: 'Monitor product expiration dates', type: 'toggle' as const },
  { key: 'damagedStockWorkflowEnabled', label: 'Damaged Stock Workflow', description: 'Enable workflow for handling damaged inventory', type: 'toggle' as const },
  { key: 'transferApprovalRequired', label: 'Transfer Approval Required', description: 'Require manager approval for warehouse transfers', type: 'toggle' as const },
];

const PRODUCT_FIELDS = [
  { key: 'dynamicAttributesEnabled', label: 'Dynamic Product Attributes', description: 'Add custom fields to products (e.g. thickness, grade)', type: 'toggle' as const },
  { key: 'variantSupportEnabled', label: 'Product Variants', description: 'Support size/color/material variants', type: 'toggle' as const },
  { key: 'barcodeGenerationEnabled', label: 'Barcode Generation', description: 'Auto-generate barcodes for products', type: 'toggle' as const },
  { key: 'skuAutoGenerationEnabled', label: 'Auto-Generate SKU', description: 'Automatically generate SKU codes for new products', type: 'toggle' as const },
  { key: 'qrCodeEnabled', label: 'QR Code Support', description: 'Generate and scan QR codes for products', type: 'toggle' as const },
  { key: 'unitConversionEnabled', label: 'Unit Conversion', description: 'Convert between measurement units (kg↔g, m↔cm)', type: 'toggle' as const },
  { key: 'comboProductEnabled', label: 'Combo Products', description: 'Create combo packs from multiple products', type: 'toggle' as const },
  { key: 'bundleProductEnabled', label: 'Bundle Products', description: 'Bundle accessories with main products', type: 'toggle' as const },
  { key: 'bomEnabled', label: 'Bill of Materials (BOM)', description: 'Define raw material recipes for manufactured goods', type: 'toggle' as const },
];

const TAX_FIELDS = [
  { key: 'gstEnabled', label: 'GST Enabled', description: 'Apply Goods & Services Tax to transactions', type: 'toggle' as const },
  { key: 'defaultGSTPercent', label: 'Default GST %', type: 'number' as const },
  { key: 'taxInclusivePricing', label: 'Tax-Inclusive Pricing', description: 'Product prices include tax by default', type: 'toggle' as const },
  { key: 'invoicePrefix', label: 'Invoice Prefix', description: 'e.g. INV-001', type: 'text' as const },
  { key: 'purchaseOrderPrefix', label: 'Purchase Order Prefix', description: 'e.g. PO-001', type: 'text' as const },
  { key: 'salesOrderPrefix', label: 'Sales Order Prefix', description: 'e.g. SO-001', type: 'text' as const },
  { key: 'currencySymbol', label: 'Currency Symbol', description: 'e.g. ₹, $, €', type: 'text' as const },
  { key: 'decimalPlaces', label: 'Decimal Places', type: 'number' as const },
  { key: 'paymentTerms', label: 'Default Payment Terms (days)', type: 'number' as const },
  { key: 'creditLimitEnabled', label: 'Credit Limit Tracking', description: 'Track and enforce customer credit limits', type: 'toggle' as const },
];

const WAREHOUSE_FIELDS = [
  { key: 'multiWarehouseEnabled', label: 'Multi-Warehouse Mode', description: 'Manage multiple warehouse locations', type: 'toggle' as const },
  { key: 'warehouseTransferEnabled', label: 'Inter-Warehouse Transfers', description: 'Move stock between warehouses', type: 'toggle' as const },
  { key: 'rackManagementEnabled', label: 'Rack Management', description: 'Organize inventory by rack/shelf location', type: 'toggle' as const },
  { key: 'binLocationEnabled', label: 'Bin Location Tracking', description: 'Track specific bin/slot positions within racks', type: 'toggle' as const },
  { key: 'warehouseApprovalRequired', label: 'Transfer Approval Workflow', description: 'Require manager approval for warehouse transfers', type: 'toggle' as const },
];

const APPROVAL_FIELDS = [
  { key: 'roleBasedAccessEnabled', label: 'Role-Based Access Control', description: 'Restrict actions based on user roles', type: 'toggle' as const },
  { key: 'purchaseApprovalRequired', label: 'Purchase Approval', description: 'Require manager sign-off on purchase orders', type: 'toggle' as const },
  { key: 'salesDiscountApprovalRequired', label: 'Discount Approval', description: 'Require approval for sales discounts above threshold', type: 'toggle' as const },
  { key: 'inventoryAdjustmentApprovalRequired', label: 'Inventory Adjustment Approval', description: 'Require approval for manual stock adjustments', type: 'toggle' as const },
  { key: 'stockTransferApprovalRequired', label: 'Stock Transfer Approval', description: 'Require approval for inter-warehouse stock transfers', type: 'toggle' as const },
];

const NOTIFICATION_FIELDS = [
  { key: 'emailNotificationsEnabled', label: 'Email Notifications', description: 'Send important alerts via email', type: 'toggle' as const },
  { key: 'smsNotificationsEnabled', label: 'SMS Notifications', description: 'Send alerts via SMS (requires SMS provider)', type: 'toggle' as const },
  { key: 'whatsappNotificationsEnabled', label: 'WhatsApp Notifications', description: 'Send alerts via WhatsApp Business API', type: 'toggle' as const },
  { key: 'lowStockAlertsEnabled', label: 'Low Stock Alerts', description: 'Alert when stock falls below reorder threshold', type: 'toggle' as const },
  { key: 'expiryAlertsEnabled', label: 'Expiry Alerts', description: 'Alert when products are nearing expiration', type: 'toggle' as const },
  { key: 'paymentRemindersEnabled', label: 'Payment Reminders', description: 'Send payment due reminders to customers', type: 'toggle' as const },
  { key: 'dailySummaryEnabled', label: 'Daily Summary Report', description: 'Send a daily business activity summary email', type: 'toggle' as const },
];

const BRANDING_FIELDS = [
  { key: 'sidebarColor', label: 'Sidebar Color', type: 'color' as const },
  { key: 'themeColor', label: 'Theme Accent Color', type: 'color' as const },
  { key: 'darkModeDefault', label: 'Dark Mode by Default', description: 'Enable dark mode as the default theme for new users', type: 'toggle' as const },
  { key: 'customDomain', label: 'Custom Domain', description: 'e.g. inventory.yourcompany.com', type: 'text' as const },
  { key: 'whiteLabelEnabled', label: 'White-Label Mode', description: 'Remove InventoryPro branding (premium only)', type: 'toggle' as const },
];

// ═══════════════════════════════════════════════════════════
// Main Settings Page
// ═══════════════════════════════════════════════════════════
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('profile');
  const { company, setCompany, user: authUser } = useAuthStore();
  const queryClient = useQueryClient();

  // --- Company Profile State ---
  const [companyData, setCompanyData] = useState({
    name: company?.name || '',
    email: company?.email || '',
    phone: '',
    address: '',
    gstNumber: '',
  });

  const { data: fetchedCompany } = useQuery({
    queryKey: ['settings-company'],
    queryFn: () => api.get('/settings/company').then(r => r.data),
    staleTime: 0,
  });

  useEffect(() => {
    if (fetchedCompany && companyData.name === company?.name && companyData.phone === '') {
      setCompanyData({
        name: fetchedCompany.name || '',
        email: fetchedCompany.email || '',
        phone: fetchedCompany.phone || '',
        address: fetchedCompany.address?.street || '',
        gstNumber: fetchedCompany.gstNumber || '',
      });
    }
  }, [fetchedCompany, company, companyData.name, companyData.phone]);

  const updateCompanyMut = useMutation({
    mutationFn: (d: any) => api.put('/settings/company', d),
    onSuccess: (res) => {
      toast.success('Company profile updated!');
      setCompany(res.data);
      queryClient.invalidateQueries({ queryKey: ['settings-company'] });
    },
    onError: () => toast.error('Failed to update company profile'),
  });

  // --- Users State ---
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', role: 'staff' });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['settings-users'],
    queryFn: () => api.get('/settings/users').then(r => r.data),
    enabled: activeTab === 'users',
  });

  const createUserMut = useMutation({
    mutationFn: (d: any) => api.post('/settings/users', d),
    onSuccess: () => {
      toast.success('Staff member invited successfully');
      setShowAddUser(false);
      setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'staff' });
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create user'),
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: string) => api.delete(`/settings/users/${id}`),
    onSuccess: () => {
      toast.success('Staff member deleted');
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Deletion failed'),
  });

  const handleCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMut.mutate(companyData);
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMut.mutate(newUser);
  };

  return (
    <div className="space-y-6 pb-6 animate-fade-in max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage global configurations, modules, and staff access control.</p>
      </div>

      {/* ── Tab Navigation ────────────────────────────────── */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2.5 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ Company Profile ═══════════ */}
      {activeTab === 'profile' && (
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Company Identity</CardTitle>
            <CardDescription>This information is publicly displayed on your invoices and reports.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompanySubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input type="email" value={companyData.email} onChange={e => setCompanyData({...companyData, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input type="tel" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>GST / Tax Registration Number</Label>
                  <Input value={companyData.gstNumber} onChange={e => setCompanyData({...companyData, gstNumber: e.target.value})} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Headquarters Address</Label>
                  <Input value={companyData.address} onChange={e => setCompanyData({...companyData, address: e.target.value})} />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={updateCompanyMut.isPending} className="gap-2">
                  {updateCompanyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ═══════════ Staff Management ═══════════ */}
      {activeTab === 'users' && (
        <Card className="animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Staff Management</CardTitle>
              <CardDescription>Invite team members and govern their module access via Roles.</CardDescription>
            </div>
            <Button onClick={() => setShowAddUser(true)} className="gap-2">
              <UserPlus className="w-4 h-4" /> Invite Staff
            </Button>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted font-medium text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 border-b">Name</th>
                      <th className="px-4 py-3 border-b">Email Address</th>
                      <th className="px-4 py-3 border-b">Assigned Role</th>
                      <th className="px-4 py-3 border-b">Status</th>
                      <th className="px-4 py-3 border-b text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users?.map((u: any) => (
                      <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{u.firstName} {u.lastName} {u._id === authUser?._id && '(You)'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="capitalize px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {u.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.role !== 'company_owner' && u._id !== authUser?._id && (
                            <button
                              onClick={() => { if(confirm(`Remove ${u.firstName} from the workspace?`)) deleteUserMut.mutate(u._id) }}
                              className="text-muted-foreground hover:text-destructive p-1"
                              title="Revoke Access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════ Industry-Aware Settings Tabs ═══════════ */}
      {activeTab === 'inventory' && (
        <SettingsTab
          endpoint="inventory"
          title="Inventory Settings"
          description="Configure how your inventory is tracked, managed, and reported."
          fields={INVENTORY_FIELDS}
        />
      )}

      {activeTab === 'products' && (
        <SettingsTab
          endpoint="products"
          title="Product Settings"
          description="Control product features like variants, barcodes, and BOM support."
          fields={PRODUCT_FIELDS}
        />
      )}

      {activeTab === 'tax' && (
        <SettingsTab
          endpoint="tax"
          title="Tax & Billing Settings"
          description="Configure tax rates, invoice numbering, and payment terms."
          fields={TAX_FIELDS}
        />
      )}

      {activeTab === 'warehouse' && (
        <SettingsTab
          endpoint="warehouse"
          title="Warehouse Configuration"
          description="Manage warehouse structure, transfers, and rack/bin organization."
          fields={WAREHOUSE_FIELDS}
        />
      )}

      {activeTab === 'approvals' && (
        <SettingsTab
          endpoint="approvals"
          title="Approval Workflows"
          description="Control which actions require manager sign-off before proceeding."
          fields={APPROVAL_FIELDS}
        />
      )}

      {activeTab === 'notifications' && (
        <SettingsTab
          endpoint="notifications"
          title="Notification Preferences"
          description="Choose how and when your team receives alerts and reminders."
          fields={NOTIFICATION_FIELDS}
        />
      )}

      {activeTab === 'branding' && (
        <SettingsTab
          endpoint="branding"
          title="Branding & Appearance"
          description="Customize colors, logos, and white-label options for your workspace."
          fields={BRANDING_FIELDS}
        />
      )}

      {/* ═══════════ Add User Modal ═══════════ */}
      {showAddUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in py-10">
          <div className="bg-card border rounded-xl shadow-xl w-full max-w-md mx-4 animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold">Invite Staff Member</h2>
              <button onClick={() => setShowAddUser(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 overflow-y-auto">
              <form id="user-form" onSubmit={handleAddUserSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Account Email</Label>
                  <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label>Temporary Password</Label>
                  <Input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} minLength={6} required />
                  <p className="text-xs text-muted-foreground">They can change this upon their first login.</p>
                </div>
                <div className="space-y-2 pt-2">
                  <Label className="flex items-center">
                    Global System Role
                    <InfoTooltip text="Role permissions strictly wall off data access. Super Admins own all data. Read-Only can view lists but cannot touch POS or Inventory levels directly." />
                  </Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value})}
                  >
                    {ROLES.filter(r => !['company_owner', 'super_admin'].includes(r.value)).map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </form>
            </div>
            <div className="p-5 border-t flex justify-end gap-3 bg-muted/20">
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
              <Button type="submit" form="user-form" disabled={createUserMut.isPending}>
                {createUserMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Invite User
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
