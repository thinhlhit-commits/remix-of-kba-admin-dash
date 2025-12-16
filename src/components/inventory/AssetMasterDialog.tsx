import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssetMasterDialogProps {
  open: boolean;
  onClose: () => void;
  editingAsset?: any;
}

export function AssetMasterDialog({
  open,
  onClose,
  editingAsset,
}: AssetMasterDialogProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    asset_name: "",
    brand: "",
    unit: "",
    quantity_supplied_previous: "",
    quantity_requested: "",
    quantity_per_contract: "",
    installation_scope: "",
    notes: "",
  });

  useEffect(() => {
    if (editingAsset) {
      setFormData({
        asset_name: editingAsset.asset_name || "",
        brand: editingAsset.brand || "",
        unit: editingAsset.unit || "",
        quantity_supplied_previous: editingAsset.quantity_supplied_previous?.toString() || "",
        quantity_requested: editingAsset.quantity_requested?.toString() || "",
        quantity_per_contract: editingAsset.quantity_per_contract?.toString() || "",
        installation_scope: editingAsset.installation_scope || "",
        notes: editingAsset.notes || "",
      });
    } else {
      resetForm();
    }
  }, [editingAsset, open]);

  const resetForm = () => {
    setFormData({
      asset_name: "",
      brand: "",
      unit: "",
      quantity_supplied_previous: "",
      quantity_requested: "",
      quantity_per_contract: "",
      installation_scope: "",
      notes: "",
    });
  };

  // Calculate derived values
  const quantitySuppliedPrev = parseFloat(formData.quantity_supplied_previous) || 0;
  const quantityRequested = parseFloat(formData.quantity_requested) || 0;
  const quantityPerContract = parseFloat(formData.quantity_per_contract) || 0;
  const cumulativeQuantity = quantitySuppliedPrev + quantityRequested;
  const remainingQuantity = quantityPerContract - cumulativeQuantity;
  const percentageRequested = quantityPerContract > 0 
    ? ((cumulativeQuantity / quantityPerContract) * 100).toFixed(1) 
    : "0";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.asset_name) {
      toast.error("Vui lòng nhập tên vật tư");
      return;
    }

    try {
      const dataToSave = {
        asset_id: editingAsset?.asset_id || `VT-${Date.now()}`,
        sku: editingAsset?.sku || `SKU-${Date.now()}`,
        asset_name: formData.asset_name,
        brand: formData.brand || null,
        unit: formData.unit || null,
        quantity_supplied_previous: parseFloat(formData.quantity_supplied_previous) || 0,
        quantity_requested: parseFloat(formData.quantity_requested) || 0,
        quantity_per_contract: parseFloat(formData.quantity_per_contract) || 0,
        installation_scope: formData.installation_scope || null,
        notes: formData.notes || null,
        asset_type: "materials" as const,
        cost_center: "default",
        created_by: user?.id,
      };

      let error;
      if (editingAsset) {
        const { error: updateError } = await supabase
          .from("asset_master_data")
          .update(dataToSave)
          .eq("id", editingAsset.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("asset_master_data")
          .insert([dataToSave]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(
        editingAsset ? "Cập nhật vật tư thành công" : "Thêm vật tư thành công"
      );
      onClose();
    } catch (error: any) {
      toast.error("Lỗi: " + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAsset ? "Chỉnh sửa Vật tư" : "Thêm Vật tư mới"}
          </DialogTitle>
          <DialogDescription>
            Nhập thông tin vật tư theo mẫu yêu cầu
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="asset_name">
              Tên Vật tư, Quy cách <span className="text-red-500">*</span>
            </Label>
            <Input
              id="asset_name"
              value={formData.asset_name}
              onChange={(e) =>
                setFormData({ ...formData, asset_name: e.target.value })
              }
              placeholder="VD: Nón bảo hộ công nhân-4 điểm neo (Vàng)"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Nhãn hiệu yêu cầu</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) =>
                  setFormData({ ...formData, brand: e.target.value })
                }
                placeholder="VD: 3M, Honeywell..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">ĐVT (Đơn vị tính)</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                placeholder="VD: Cái, Bộ, M..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity_supplied_previous">KL đã cấp đến kỳ trước</Label>
              <Input
                id="quantity_supplied_previous"
                type="number"
                step="0.01"
                value={formData.quantity_supplied_previous}
                onChange={(e) =>
                  setFormData({ ...formData, quantity_supplied_previous: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity_requested">KL yêu cầu kỳ này</Label>
              <Input
                id="quantity_requested"
                type="number"
                step="0.01"
                value={formData.quantity_requested}
                onChange={(e) =>
                  setFormData({ ...formData, quantity_requested: e.target.value })
                }
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity_per_contract">KL theo HĐ/PL/PS (Khối lượng theo hợp đồng)</Label>
            <Input
              id="quantity_per_contract"
              type="number"
              step="0.01"
              value={formData.quantity_per_contract}
              onChange={(e) =>
                setFormData({ ...formData, quantity_per_contract: e.target.value })
              }
              placeholder="0"
            />
          </div>

          {/* Calculated fields - read only */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">KL cộng dồn các kỳ</Label>
              <div className="font-medium">{cumulativeQuantity}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Khối lượng còn lại</Label>
              <div className="font-medium">{remainingQuantity}</div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">% khối lượng yêu cầu</Label>
              <div className="font-medium">{percentageRequested}%</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="installation_scope">Phạm vi lắp đặt</Label>
            <Input
              id="installation_scope"
              value={formData.installation_scope}
              onChange={(e) =>
                setFormData({ ...formData, installation_scope: e.target.value })
              }
              placeholder="VD: Tầng 1, Khu A..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Ghi chú</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="VD: IPC cấp áo lưới..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">
              {editingAsset ? "Cập nhật" : "Thêm mới"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
