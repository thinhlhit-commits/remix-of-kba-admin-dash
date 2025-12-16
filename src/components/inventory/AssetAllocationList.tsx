import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, Plus, ArrowLeft, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AssetAllocationDialog } from "./AssetAllocationDialog";
import * as XLSX from "xlsx";

interface AssetAllocation {
  id: string;
  asset_master_id: string;
  allocated_to: string;
  purpose: string;
  allocation_date: string;
  expected_return_date: string | null;
  actual_return_date: string | null;
  status: string;
  return_condition: string | null;
  reusability_percentage: number | null;
  asset_master_data: {
    asset_id: string;
    asset_name: string;
  } | null;
  allocated_to_profile?: {
    full_name: string;
  } | null;
}

export function AssetAllocationList() {
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<AssetAllocation | null>(null);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      
      // Fetch allocations with asset data
      const { data: allocationsData, error: allocationsError } = await supabase
        .from("asset_allocations")
        .select(`
          *,
          asset_master_data(asset_id, asset_name)
        `)
        .order("allocation_date", { ascending: false });

      if (allocationsError) throw allocationsError;

      // Get unique user IDs
      const userIds = [...new Set((allocationsData || []).map(a => a.allocated_to))];
      
      // Fetch profiles for those users
      let profilesMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        profilesMap = (profilesData || []).reduce((acc, p) => {
          acc[p.id] = p.full_name;
          return acc;
        }, {} as Record<string, string>);
      }

      // Merge allocations with profile names
      const allocationsWithProfiles = (allocationsData || []).map(allocation => ({
        ...allocation,
        allocated_to_profile: profilesMap[allocation.allocated_to] 
          ? { full_name: profilesMap[allocation.allocated_to] }
          : null
      }));

      setAllocations(allocationsWithProfiles as any);
    } catch (error: any) {
      toast.error("Lỗi tải dữ liệu: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const filteredAllocations = allocations.filter((allocation) => {
    const matchesSearch = Object.values(allocation).some((value) =>
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    );
    const matchesStatus = statusFilter === "all" || allocation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportToExcel = () => {
    const exportData = filteredAllocations.map((allocation) => ({
      "Mã Tài sản": allocation.asset_master_data?.asset_id || "",
      "Tên Tài sản": allocation.asset_master_data?.asset_name || "",
      "Người sử dụng": allocation.allocated_to_profile?.full_name || "",
      "Mục đích": allocation.purpose,
      "Ngày phân bổ": format(new Date(allocation.allocation_date), "dd/MM/yyyy"),
      "Hạn hoàn trả": allocation.expected_return_date
        ? format(new Date(allocation.expected_return_date), "dd/MM/yyyy")
        : "",
      "Ngày hoàn trả thực tế": allocation.actual_return_date
        ? format(new Date(allocation.actual_return_date), "dd/MM/yyyy")
        : "",
      "Trạng thái": getStatusLabel(allocation.status),
      "Tình trạng hoàn trả": allocation.return_condition || "",
      "% Tái sử dụng": allocation.reusability_percentage ?? "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Phân bổ tài sản");
    
    // Auto-size columns
    const colWidths = Object.keys(exportData[0] || {}).map((key) => ({
      wch: Math.max(key.length, 15),
    }));
    ws["!cols"] = colWidths;

    XLSX.writeFile(wb, `Phan_bo_tai_san_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("Xuất file Excel thành công!");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-500",
      returned: "bg-blue-500",
      overdue: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Đang sử dụng",
      returned: "Đã hoàn trả",
      overdue: "Quá hạn",
    };
    return labels[status] || status;
  };

  const handleReturn = (allocation: AssetAllocation) => {
    setSelectedAllocation(allocation);
    setReturnDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setReturnDialogOpen(false);
    setSelectedAllocation(null);
    fetchAllocations();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <Input
            placeholder="Tìm kiếm phân bổ tài sản..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Đang sử dụng</SelectItem>
              <SelectItem value="returned">Đã hoàn trả</SelectItem>
              <SelectItem value="overdue">Quá hạn</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToExcel}
            variant="outline"
            size="sm"
            disabled={filteredAllocations.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </Button>
          <Button
            onClick={fetchAllocations}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Button onClick={() => setDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Phân Bổ Tài sản
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mã Tài sản</TableHead>
              <TableHead>Tên Tài sản</TableHead>
              <TableHead>Người sử dụng</TableHead>
              <TableHead>Mục đích</TableHead>
              <TableHead>Ngày phân bổ</TableHead>
              <TableHead>Hạn hoàn trả</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : filteredAllocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Chưa có dữ liệu
                </TableCell>
              </TableRow>
            ) : (
              filteredAllocations.map((allocation) => (
                <TableRow key={allocation.id}>
                  <TableCell className="font-medium">
                    {allocation.asset_master_data?.asset_id}
                  </TableCell>
                  <TableCell>{allocation.asset_master_data?.asset_name}</TableCell>
                  <TableCell>{allocation.allocated_to_profile?.full_name || "-"}</TableCell>
                  <TableCell>{allocation.purpose}</TableCell>
                  <TableCell>
                    {format(new Date(allocation.allocation_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {allocation.expected_return_date
                      ? format(
                          new Date(allocation.expected_return_date),
                          "dd/MM/yyyy"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(allocation.status)}>
                      {getStatusLabel(allocation.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {allocation.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReturn(allocation)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Hoàn trả
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AssetAllocationDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        isReturn={false}
      />

      <AssetAllocationDialog
        open={returnDialogOpen}
        onClose={handleCloseDialog}
        isReturn={true}
        allocation={selectedAllocation}
      />
    </div>
  );
}
