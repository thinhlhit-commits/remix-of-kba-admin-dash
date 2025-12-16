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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AssetAllocationDialogProps {
  open: boolean;
  onClose: () => void;
  isReturn: boolean;
  allocation?: any;
}

export function AssetAllocationDialog({
  open,
  onClose,
  isReturn,
  allocation,
}: AssetAllocationDialogProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    asset_master_id: "",
    allocated_to: "",
    purpose: "",
    project_id: "",
    expected_return_date: "",
    return_condition: "",
    reusability_percentage: "",
  });

  useEffect(() => {
    if (open) {
      fetchAssets();
      fetchUsers();
      fetchProjects();
    }
  }, [open]);

  useEffect(() => {
    if (allocation && isReturn) {
      setFormData({
        asset_master_id: allocation.asset_master_id,
        allocated_to: allocation.allocated_to,
        purpose: allocation.purpose,
        project_id: allocation.project_id || "",
        expected_return_date: allocation.expected_return_date || "",
        return_condition: "",
        reusability_percentage: "",
      });
    } else {
      resetForm();
    }
  }, [allocation, isReturn, open]);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from("asset_master_data")
      .select("id, asset_id, asset_name, current_status")
      .in("current_status", ["in_stock", "ready_for_reallocation"]);
    setAssets(data || []);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, full_name");
    setUsers(data || []);
  };

  const fetchProjects = async () => {
    const { data } = await supabase.from("projects").select("id, name");
    setProjects(data || []);
  };

  const resetForm = () => {
    setFormData({
      asset_master_id: "",
      allocated_to: "",
      purpose: "",
      project_id: "",
      expected_return_date: "",
      return_condition: "",
      reusability_percentage: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReturn) {
      // Xử lý hoàn trả
      try {
        const { error: updateAllocationError } = await supabase
          .from("asset_allocations")
          .update({
            status: "returned",
            actual_return_date: new Date().toISOString(),
            return_condition: formData.return_condition,
            reusability_percentage: formData.reusability_percentage
              ? parseFloat(formData.reusability_percentage)
              : null,
          })
          .eq("id", allocation.id);

        if (updateAllocationError) throw updateAllocationError;

        // Cập nhật trạng thái tài sản
        const newStatus =
          parseFloat(formData.reusability_percentage || "0") >= 80
            ? "ready_for_reallocation"
            : "under_maintenance";

        const { error: updateAssetError } = await supabase
          .from("asset_master_data")
          .update({ current_status: newStatus })
          .eq("id", allocation.asset_master_id);

        if (updateAssetError) throw updateAssetError;

        toast.success("Hoàn trả tài sản thành công");
        onClose();
      } catch (error: any) {
        toast.error("Lỗi: " + error.message);
      }
    } else {
      // Xử lý phân bổ mới
      if (!formData.asset_master_id || !formData.allocated_to || !formData.purpose) {
        toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
        return;
      }

      try {
        const { error: insertError } = await supabase
          .from("asset_allocations")
          .insert([
            {
              asset_master_id: formData.asset_master_id,
              allocated_to: formData.allocated_to,
              allocated_by: user?.id,
              purpose: formData.purpose,
              project_id: formData.project_id || null,
              expected_return_date: formData.expected_return_date || null,
              status: "active",
            },
          ]);

        if (insertError) throw insertError;

        // Cập nhật trạng thái tài sản
        const { error: updateError } = await supabase
          .from("asset_master_data")
          .update({ current_status: "allocated" })
          .eq("id", formData.asset_master_id);

        if (updateError) throw updateError;

        toast.success("Phân bổ tài sản thành công");
        onClose();
      } catch (error: any) {
        toast.error("Lỗi: " + error.message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isReturn ? "Hoàn Trả Tài sản" : "Phân Bổ Tài sản"}
          </DialogTitle>
          <DialogDescription>
            {isReturn
              ? "Luồng 3: Hoàn Trả & Luân Chuyển Vốn"
              : "Luồng 2: Phân Bổ, Theo Dõi & Luân Chuyển"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isReturn && (
            <>
              <div className="space-y-2">
                <Label htmlFor="asset_master_id">
                  Tài sản <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.asset_master_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, asset_master_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tài sản" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_id} - {asset.asset_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allocated_to">
                  Người sử dụng <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.allocated_to}
                  onValueChange={(value) =>
                    setFormData({ ...formData, allocated_to: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn người sử dụng" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">
                  Mục đích sử dụng <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="purpose"
                  value={formData.purpose}
                  onChange={(e) =>
                    setFormData({ ...formData, purpose: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_id">Dự án (nếu có)</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, project_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn dự án" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_return_date">Hạn hoàn trả dự kiến</Label>
                <Input
                  id="expected_return_date"
                  type="date"
                  value={formData.expected_return_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expected_return_date: e.target.value,
                    })
                  }
                />
              </div>
            </>
          )}

          {isReturn && (
            <>
              <div className="space-y-2">
                <Label htmlFor="return_condition">Tình trạng khi hoàn trả</Label>
                <Textarea
                  id="return_condition"
                  value={formData.return_condition}
                  onChange={(e) =>
                    setFormData({ ...formData, return_condition: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reusability_percentage">
                  Phần trăm Tái Sử dụng (%)
                </Label>
                <Input
                  id="reusability_percentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.reusability_percentage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reusability_percentage: e.target.value,
                    })
                  }
                  placeholder="0-100"
                />
                <p className="text-sm text-muted-foreground">
                  Từ 80% trở lên: Sẵn sàng tái phân bổ. Dưới 80%: Cần bảo trì.
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit">
              {isReturn ? "Xác nhận Hoàn trả" : "Phân Bổ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
