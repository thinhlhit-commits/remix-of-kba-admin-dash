import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Plus, FileText, Upload, Trash2, Eye } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AssetMasterDialog } from "./AssetMasterDialog";
import { AssetImportDialog } from "./AssetImportDialog";
import { ExportButtons } from "@/components/ExportButtons";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

interface AssetMaster {
  id: string;
  asset_id: string;
  asset_name: string;
  brand: string | null;
  unit: string | null;
  quantity_supplied_previous: number | null;
  quantity_requested: number | null;
  quantity_per_contract: number | null;
  installation_scope: string | null;
  notes: string | null;
}

export function AssetMasterList() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<AssetMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<AssetMaster | null>(null);
  const [deletingAsset, setDeletingAsset] = useState<AssetMaster | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("asset_master_data")
        .select("id, asset_id, asset_name, brand, unit, quantity_supplied_previous, quantity_requested, quantity_per_contract, installation_scope, notes")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error: any) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const filteredAssets = assets.filter((asset) =>
    Object.values(asset).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleEdit = (asset: AssetMaster) => {
    setEditingAsset(asset);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAsset(null);
    fetchAssets();
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    fetchAssets();
  };

  const handleDelete = async () => {
    if (!deletingAsset) return;
    try {
      const { error } = await supabase
        .from("asset_master_data")
        .delete()
        .eq("id", deletingAsset.id);

      if (error) throw error;
      toast.success("Đã xóa vật tư thành công");
      fetchAssets();
    } catch (error: any) {
      toast.error("Lỗi xóa vật tư: " + error.message);
    } finally {
      setDeletingAsset(null);
    }
  };

  // Calculate derived fields
  const getCumulativeQuantity = (asset: AssetMaster) => {
    const prev = Number(asset.quantity_supplied_previous) || 0;
    const requested = Number(asset.quantity_requested) || 0;
    return prev + requested;
  };

  const getRemainingQuantity = (asset: AssetMaster) => {
    const contract = Number(asset.quantity_per_contract) || 0;
    const cumulative = getCumulativeQuantity(asset);
    return contract - cumulative;
  };

  const getPercentage = (asset: AssetMaster) => {
    const contract = Number(asset.quantity_per_contract) || 0;
    if (contract === 0) return 0;
    const cumulative = getCumulativeQuantity(asset);
    return (cumulative / contract) * 100;
  };

  const handleExportAssets = (format: "excel" | "pdf") => {
    const exportData = filteredAssets.map((asset, index) => ({
      STT: index + 1,
      "Tên Vật tư, Quy cách": asset.asset_name,
      "Nhãn hiệu yêu cầu": asset.brand || "",
      "ĐVT": asset.unit || "",
      "KL đã cấp đến kỳ trước": asset.quantity_supplied_previous || 0,
      "KL yêu cầu kỳ này": asset.quantity_requested || 0,
      "KL cộng dồn các kỳ": getCumulativeQuantity(asset),
      "KL theo HĐ/PL/PS": asset.quantity_per_contract || 0,
      "Khối lượng còn lại": getRemainingQuantity(asset),
      "% khối lượng yêu cầu": getPercentage(asset).toFixed(1) + "%",
      "Phạm vi lắp đặt": asset.installation_scope || "",
      "Ghi chú": asset.notes || "",
    }));

    const options = {
      title: "Báo cáo Vật tư",
      filename: "bao_cao_vat_tu",
      columns: [
        { key: "STT", header: "STT" },
        { key: "Tên Vật tư, Quy cách", header: "Tên Vật tư, Quy cách" },
        { key: "Nhãn hiệu yêu cầu", header: "Nhãn hiệu yêu cầu" },
        { key: "ĐVT", header: "ĐVT" },
        { key: "KL đã cấp đến kỳ trước", header: "KL đã cấp kỳ trước" },
        { key: "KL yêu cầu kỳ này", header: "KL yêu cầu kỳ này" },
        { key: "KL cộng dồn các kỳ", header: "KL cộng dồn" },
        { key: "KL theo HĐ/PL/PS", header: "KL theo HĐ/PL/PS" },
        { key: "Khối lượng còn lại", header: "KL còn lại" },
        { key: "% khối lượng yêu cầu", header: "% KL yêu cầu" },
        { key: "Phạm vi lắp đặt", header: "Phạm vi lắp đặt" },
        { key: "Ghi chú", header: "Ghi chú" },
      ],
      data: exportData,
      summary: [
        { label: "Tổng số vật tư", value: filteredAssets.length.toString() },
      ],
    };
    format === "excel" ? exportToExcel(options) : exportToPDF(options);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm vật tư..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButtons
            onExportExcel={() => handleExportAssets("excel")}
            onExportPDF={() => handleExportAssets("pdf")}
            disabled={loading || filteredAssets.length === 0}
          />
          <Button
            onClick={fetchAssets}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button
            onClick={() => setImportDialogOpen(true)}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4 mr-2" />
            Nhập Excel
          </Button>
          <Button
            onClick={() => setDialogOpen(true)}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Thêm Vật tư
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">STT</TableHead>
              <TableHead className="min-w-[200px]">Tên Vật tư, Quy cách</TableHead>
              <TableHead>Nhãn hiệu yêu cầu</TableHead>
              <TableHead className="w-16">ĐVT</TableHead>
              <TableHead className="text-right">KL đã cấp kỳ trước</TableHead>
              <TableHead className="text-right">KL yêu cầu kỳ này</TableHead>
              <TableHead className="text-right">KL cộng dồn</TableHead>
              <TableHead className="text-right">KL theo HĐ/PL/PS</TableHead>
              <TableHead className="text-right">KL còn lại</TableHead>
              <TableHead className="text-right">% KL yêu cầu</TableHead>
              <TableHead>Phạm vi lắp đặt</TableHead>
              <TableHead>Ghi chú</TableHead>
              <TableHead className="w-20">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} className="text-center py-8">
                  Chưa có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset, index) => {
                const cumulative = getCumulativeQuantity(asset);
                const remaining = getRemainingQuantity(asset);
                const percentage = getPercentage(asset);
                
                return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{asset.asset_name}</TableCell>
                    <TableCell>{asset.brand || "-"}</TableCell>
                    <TableCell>{asset.unit || "-"}</TableCell>
                    <TableCell className="text-right">
                      {asset.quantity_supplied_previous || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {asset.quantity_requested || 0}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {cumulative}
                    </TableCell>
                    <TableCell className="text-right">
                      {asset.quantity_per_contract || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {remaining}
                    </TableCell>
                    <TableCell className="text-right">
                      {percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell className="max-w-[120px]">
                      {asset.installation_scope ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-1 text-left hover:text-primary transition-colors">
                              <span className="block max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">{asset.installation_scope}</span>
                              <Eye className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 max-h-60 overflow-auto">
                            <p className="text-sm whitespace-pre-wrap">{asset.installation_scope}</p>
                          </PopoverContent>
                        </Popover>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="max-w-[120px]">
                      {asset.notes ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-1 text-left hover:text-primary transition-colors">
                              <span className="block max-w-[90px] overflow-hidden text-ellipsis whitespace-nowrap">{asset.notes}</span>
                              <Eye className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 max-h-60 overflow-auto">
                            <p className="text-sm whitespace-pre-wrap">{asset.notes}</p>
                          </PopoverContent>
                        </Popover>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(asset)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingAsset(asset)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AssetMasterDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        editingAsset={editingAsset}
      />

      <AssetImportDialog
        open={importDialogOpen}
        onClose={handleCloseImportDialog}
      />

      <AlertDialog open={!!deletingAsset} onOpenChange={() => setDeletingAsset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa vật tư</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa vật tư "{deletingAsset?.asset_name}"? 
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
