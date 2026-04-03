import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PackageSearch, ArrowUpCircle, ArrowDownCircle, RefreshCw, ArrowRightLeft, Plus, X, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from '@/components/ui/tooltip';
import api from '@/services/api';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'stock' | 'logs'>('stock');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    variantId: '',
    warehouseId: '',
    type: 'stock_in',
    quantity: 1,
    reason: '',
  });

  const [validationResults, setValidationResults] = useState<{ success: boolean; errors: any[]; warnings: any[] } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const queryClient = useQueryClient();

  const { data: products } = useQuery({ queryKey: ['products-short'], queryFn: () => api.get('/products?limit=500').then(r => r.data.data) });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses-short'], queryFn: () => api.get('/warehouses?limit=50').then(r => r.data) });

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['inventory', page],
    queryFn: () => api.get('/inventory', { params: { page, limit: 20 } }).then(r => r.data),
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['stock-logs', logsPage],
    queryFn: () => api.get('/inventory/logs', { params: { page: logsPage, limit: 20 } }).then(r => r.data),
    enabled: activeTab === 'logs',
  });

  const adjustMut = useMutation({
    mutationFn: (d: any) => {
      const endpoint = d.type === 'stock_in' ? '/inventory/stock-in' : '/inventory/stock-out';
      return api.post(endpoint, {
        productId: d.productId,
        variantId: d.variantId,
        warehouseId: d.warehouseId,
        quantity: Number(d.quantity),
        notes: d.reason || 'Manual Adjustment',
      });
    },
    onSuccess: () => {
      toast.success('Stock physically adjusted & logged');
      setShowAdjustModal(false);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to adjust stock'),
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.variantId || !adjustForm.warehouseId || adjustForm.quantity <= 0) return toast.error('Invalid parameters');
    adjustMut.mutate(adjustForm);
  };

  const runAudit = async () => {
    setIsValidating(true);
    try {
      const res = await api.get('/inventory/validate');
      setValidationResults(res.data);
      if (res.data.errors.length > 0) {
        toast.error(`Audit found ${res.data.errors.length} critical issues!`);
      } else {
        toast.success('System health audit complete: No issues found.');
      }
    } catch (e) {
      toast.error('Audit failed to run.');
    } finally {
      setIsValidating(false);
    }
  };

  const stockColumns = [
    { key: 'variantId', label: 'Item / Variant', render: (i: any) => (
      <div>
        <p className="font-medium">{i.variantId?.sku || 'N/A'}</p>
        <p className="text-xs text-muted-foreground">{i.productId?.name || ''}</p>
      </div>
    )},
    { key: 'warehouseId', label: 'Warehouse', render: (i: any) => i.warehouseId?.name || 'N/A' },
    { key: 'availableQuantity', label: 'Available', render: (i: any) => (
      <span className="font-bold text-green-600">{i.availableQuantity || 0}</span>
    )},
    { key: 'reservedQuantity', label: 'Reserved', render: (i: any) => (
      <span className="text-orange-500">{i.reservedQuantity || 0}</span>
    )},
    { key: 'totalQuantity', label: 'Total Total', render: (i: any) => (
      <span className="font-medium">{i.totalQuantity || 0}</span>
    )},
  ];

  const logColumns = [
    { key: 'type', label: 'Type', render: (i: any) => {
      const icons: Record<string, any> = {
        stock_in: { icon: ArrowUpCircle, color: 'text-green-500', bg: 'bg-green-50' },
        stock_out: { icon: ArrowDownCircle, color: 'text-red-500', bg: 'bg-red-50' },
        adjustment: { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-50' },
        transfer: { icon: ArrowRightLeft, color: 'text-purple-500', bg: 'bg-purple-50' },
      };
      const cfg = icons[i.type] || icons.adjustment;
      const Icon = cfg.icon;
      return (
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-md ${cfg.bg} flex items-center justify-center dark:bg-opacity-20`}>
            <Icon className={`w-4 h-4 ${cfg.color}`} />
          </div>
          <span className="capitalize text-sm">{i.type?.replace('_', ' ')}</span>
        </div>
      );
    }},
    { key: 'productId', label: 'Product', render: (i: any) => i.productId?.name || 'N/A' },
    { key: 'quantity', label: 'Qty', render: (i: any) => <span className="font-medium">{i.quantity}</span> },
    { key: 'previousQuantity', label: 'Before', render: (i: any) => i.previousQuantity ?? '-' },
    { key: 'newQuantity', label: 'After', render: (i: any) => i.newQuantity ?? '-' },
    { key: 'createdAt', label: 'Date', render: (i: any) => new Date(i.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Track stock levels and movements across warehouses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={runAudit} disabled={isValidating} className="gap-2 border-primary/30 text-primary">
            {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Health Audit
          </Button>
          <Button onClick={() => setShowAdjustModal(true)} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Adjust Stock
          </Button>
        </div>
      </div>

      {/* Validation Alert */}
      {validationResults && validationResults.errors.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="py-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <CardTitle className="text-sm">Critical Data Conflicts Detected</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-3 text-sm space-y-1">
            {validationResults.errors.map((err, idx) => (
              <p key={idx} className="flex gap-2">
                <span className="font-bold min-w-24">[{err.type}]</span>
                <span className="text-muted-foreground">{err.message}</span>
              </p>
            ))}
            <Button variant="ghost" size="sm" className="mt-2 text-xs h-7" onClick={() => setValidationResults(null)}>Dismiss Report</Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['stock', 'logs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'stock' ? 'Stock Levels' : 'Movement Logs'}
          </button>
        ))}
      </div>

      {activeTab === 'stock' ? (
        <DataTable
          title="Current Stock"
          columns={stockColumns}
          data={stockData?.data || []}
          total={stockData?.total || 0}
          page={stockData?.page || 1}
          totalPages={stockData?.totalPages || 1}
          isLoading={stockLoading}
          onPageChange={setPage}
        />
      ) : (
        <DataTable
          title="Stock Movement Logs"
          columns={logColumns}
          data={logsData?.data || []}
          total={logsData?.total || 0}
          page={logsData?.page || 1}
          totalPages={logsData?.totalPages || 1}
          isLoading={logsLoading}
          onPageChange={setLogsPage}
        />
      )}

      {/* Adjust Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl animate-scale-in border">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2"><RefreshCw className="w-5 h-5 text-primary" /> Adjust Stock Level</h2>
              <button onClick={() => setShowAdjustModal(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            
            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Target Item / Variant</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={adjustForm.variantId} onChange={(e) => {
                  const vId = e.target.value;
                  let pId = '';
                  products?.forEach((p: any) => {
                    if (p.variants?.some((v: any) => v._id === vId)) pId = p._id;
                  });
                  setAdjustForm({...adjustForm, variantId: vId, productId: pId});
                }} required>
                  <option value="">Select an item...</option>
                  {products?.map((p: any) => (
                    <optgroup key={p._id} label={p.name}>
                       {p.variants?.map((v: any) => (
                         <option key={v._id} value={v._id}>{p.name} ({v.sku})</option>
                       ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Target Warehouse</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={adjustForm.warehouseId} onChange={(e) => setAdjustForm({...adjustForm, warehouseId: e.target.value})} required>
                  <option value="">Select warehouse...</option>
                  {warehouses?.map((w: any) => <option key={w._id} value={w._id}>{w.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center">
                    Adjustment Type
                    <InfoTooltip text="Stock In (+) adds raw inventory to your warehouse entirely without processing a Purchase Order invoice. Mostly used for physical migrations. Stock Out (-) physically writes-off damaged or lost inventory entirely without generating a customer Sale invoice." />
                  </Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 shadow-sm text-sm" value={adjustForm.type} onChange={e => setAdjustForm({...adjustForm, type: e.target.value as any})}>
                    <option value="stock_in">Stock In (+)</option>
                    <option value="stock_out">Stock Out (-)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={adjustForm.quantity} onChange={(e) => setAdjustForm({...adjustForm, quantity: Number(e.target.value)})} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason / Note</Label>
                <Input placeholder="e.g. Initial migration from Excel" value={adjustForm.reason} onChange={(e) => setAdjustForm({...adjustForm, reason: e.target.value})} />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowAdjustModal(false)}>Cancel</Button>
                <Button type="submit" disabled={adjustMut.isPending}>
                  {adjustMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Execute Adjustment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
