import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert, Trash2, ExternalLink, Filter, Search as SearchIcon, Loader2, Plus, Building, Mail, User, CheckCircle2, CreditCard, ShieldQuestion } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/services/api';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function AdminCompaniesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    industry: 'retail_store',
    ownerFirstName: '',
    ownerLastName: '',
    ownerEmail: '',
    subscriptionPlan: 'free_trial'
  });

  const { data: companiesResp, isLoading } = useQuery({
    queryKey: ['admin', 'companies', search, page],
    queryFn: () => api.get('/admin/companies', { params: { search, page } }).then(r => r.data),
  });

  // DIAGNOSTIC LOG
  useState(() => {
    console.log('[DIAGNOSTIC] AdminCompaniesPage Mounted');
  });

  if (companiesResp) {
    console.log('[DIAGNOSTIC] API RESPONSE RECEIVED:', companiesResp);
  }

  const statusMut = useMutation({
    mutationFn: ({ id, isActive, reason }: { id: string; isActive: boolean; reason?: string }) => 
      api.put(`/admin/companies/${id}/status`, { isActive, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
      toast.success('Company status updated');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/companies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
      toast.success('Company deleted from master DB');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Delete failed'),
  });

  const planMut = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) => 
      api.put(`/admin/companies/${id}/plan`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
      toast.success('Subscription plan updated');
      setIsPlanModalOpen(false);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const createMut = useMutation({
    mutationFn: (data: typeof formData) => api.post('/admin/companies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'companies'] });
      toast.success('Company created and invitation sent!');
      setIsModalOpen(false);
      setFormData({
        name: '',
        industry: 'retail_store',
        ownerFirstName: '',
        ownerLastName: '',
        ownerEmail: '',
        subscriptionPlan: 'free_trial'
      });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Creation failed'),
  });

  const columns = [
    { 
      key: 'name', 
      label: 'Company', 
      render: (i: any) => (
        <div className="flex flex-col">
          <span className="font-bold">{i.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{i.slug}</span>
        </div>
      )
    },
    { 
      key: 'subscriptionPlan', 
      label: 'Plan', 
      render: (i: any) => (
        <Badge variant={i.subscriptionPlan === 'premium' ? 'default' : 'secondary'} className="capitalize">
          {i.subscriptionPlan?.replace('_', ' ')}
        </Badge>
      )
    },
    { 
      key: 'userCount', 
      label: 'Users',
      render: (i: any) => i.userCount || 0
    },
    { 
      key: 'isActive', 
      label: 'Status', 
      render: (i: any) => (
        <Badge variant={i.isActive ? 'outline' : 'destructive'} className={i.isActive ? 'text-green-600 border-green-600' : ''}>
          {i.isActive ? 'Active' : 'Suspended'}
        </Badge>
      )
    },
    { 
      key: 'createdAt', 
      label: 'Joined', 
      render: (i: any) => new Date(i.createdAt).toLocaleDateString()
    },
    {
      key: 'actions',
      label: 'Portal Actions',
      render: (i: any) => (
        <div className="flex items-center gap-2">
          {i.isActive ? (
            <Button 
              type="button"
              size="icon" 
              variant="outline" 
              className="h-8 w-8 text-amber-600 border-amber-600 hover:bg-amber-50"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                statusMut.mutate({ id: i._id, isActive: false, reason: 'Manual suspension' });
              }}
              title="Suspend Tenant"
            >
              <ShieldAlert className="h-4 w-4" />
            </Button>
          ) : (
            <Button 
              type="button"
              size="icon" 
              variant="outline" 
              className="h-8 w-8 text-green-600 border-green-600 hover:bg-green-50"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                statusMut.mutate({ id: i._id, isActive: true });
              }}
              title="Activate Tenant"
            >
              <ShieldCheck className="h-4 w-4" />
            </Button>
          )}

          <Button 
            size="icon" 
            variant="outline" 
            className="h-8 w-8 text-primary border-primary hover:bg-primary/5"
            onClick={() => {
              setSelectedCompany(i);
              setIsPlanModalOpen(true);
            }}
            title="Change Plan"
          >
            <CreditCard className="h-4 w-4" />
          </Button>
          
          {!i.isActive && (
            <Button 
              type="button"
              size="icon" 
              variant="outline" 
              className="h-8 w-8 text-red-600 border-red-600 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                deleteMut.mutate(i._id);
              }}
              title="Delete Forever"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Companies</h1>
          <p className="text-muted-foreground text-sm mt-1">Search and control all tenant organizations on the platform.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Company
        </Button>
      </div>

      <div className="flex items-center gap-4 bg-muted/30 p-4 rounded-xl border">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, ID or slug..." 
            className="pl-9 bg-background"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Filter className="w-3.5 h-3.5" />
          <span>Total: {companiesResp?.total || 0}</span>
        </div>
      </div>

      <DataTable 
        title="Organization Registry"
        description="Master DB records for all business entities."
        columns={columns}
        data={companiesResp?.data || []}
        isLoading={isLoading}
        total={companiesResp?.total || 0}
        page={page}
        onPageChange={setPage}
      />
      
      {(statusMut.isPending || deleteMut.isPending) && (
        <div className="fixed bottom-8 right-8 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Updating Platform Registry...</span>
        </div>
      )}

      {/* Create Company Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-muted/30">
              <h2 className="text-xl font-bold">Register New Organization</h2>
              <p className="text-sm text-muted-foreground mt-1">Provision a new tenant environment and invite the company owner.</p>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(formData); }} className="p-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Company Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                    <Building className="w-3 h-3" /> Organization Info
                  </h3>
                  <div className="space-y-2">
                    <Label>Company Name</Label>
                    <Input 
                      required 
                      placeholder="e.g. Acme Corp" 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                      value={formData.industry}
                      onChange={e => setFormData({...formData, industry: e.target.value})}
                    >
                      <option value="retail_store">Retail Store</option>
                      <option value="warehouse">Warehouse</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Initial Plan</Label>
                    <select 
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:ring-2 focus:ring-primary outline-none"
                      value={formData.subscriptionPlan}
                      onChange={e => setFormData({...formData, subscriptionPlan: e.target.value})}
                    >
                      <option value="free_trial">Free Trial (14 Days)</option>
                      <option value="basic">Basic</option>
                      <option value="standard">Standard</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                {/* Owner Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary/70 flex items-center gap-2">
                    <User className="w-3 h-3" /> Owner (Admin) Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input 
                        required 
                        placeholder="John" 
                        value={formData.ownerFirstName}
                        onChange={e => setFormData({...formData, ownerFirstName: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input 
                        required 
                        placeholder="Doe" 
                        value={formData.ownerLastName}
                        onChange={e => setFormData({...formData, ownerLastName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input 
                        required 
                        type="email" 
                        placeholder="owner@company.com" 
                        className="pl-9"
                        value={formData.ownerEmail}
                        onChange={e => setFormData({...formData, ownerEmail: e.target.value})}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> An invitation with a setup link will be sent here.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMut.isPending} className="min-w-[140px]">
                  {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create and Invite'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Plan Modal */}
      {isPlanModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-primary/5">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> 
                Update Subscription
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Manual plan override for <strong>{selectedCompany.name}</strong></p>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <Label>Select New Plan</Label>
                <div className="grid grid-cols-1 gap-2">
                  {['free_trial', 'basic', 'standard', 'premium'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setSelectedCompany({ ...selectedCompany, subscriptionPlan: p })}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border-2 transition-all text-sm",
                        selectedCompany.subscriptionPlan === p 
                          ? "border-primary bg-primary/5 font-bold" 
                          : "border-transparent bg-muted/30 hover:border-muted-foreground/30"
                      )}
                    >
                      <span className="capitalize">{p.replace('_', ' ')}</span>
                      {selectedCompany.subscriptionPlan === p && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setIsPlanModalOpen(false)}>Cancel</Button>
                <Button 
                  disabled={planMut.isPending} 
                  onClick={() => planMut.mutate({ id: selectedCompany._id, plan: selectedCompany.subscriptionPlan })}
                >
                  {planMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Change'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
