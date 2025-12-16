import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { InventoryItemDialog } from "./InventoryItemDialog";
import { ExportButtons } from "@/components/ExportButtons";
import { exportToExcel, exportToPDF, inventoryExportConfig } from "@/lib/exportUtils";

interface InventoryItem {
  id: string;
  product_code: string;
  product_name: string;
  unit: string;
  wholesale_price: number;
  retail_price: number;
  stock_quantity: number;
  business_type: string;
  product_categories?: { name: string };
  brands?: { name: string };
  product_groups?: { name: string };
}

export const InventoryList = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(`
          *,
          product_categories (name),
          brands (name),
          product_groups (name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.product_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.product_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingItem(null);
    fetchItems();
  };

  const handleExportInventory = (format: "excel" | "pdf") => {
    const options = {
      title: "Báo cáo Tồn kho Vật tư",
      filename: "bao_cao_ton_kho",
      ...inventoryExportConfig,
      data: filteredItems,
      summary: [
        { label: "Tổng sản phẩm", value: filteredItems.length.toString() },
        { label: "Tổng tồn kho", value: filteredItems.reduce((s, i) => s + Number(i.stock_quantity || 0), 0).toString() },
      ],
    };
    format === "excel" ? exportToExcel(options) : exportToPDF(options);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm hàng hóa"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <ExportButtons
            onExportExcel={() => handleExportInventory("excel")}
            onExportPDF={() => handleExportInventory("pdf")}
            disabled={loading || filteredItems.length === 0}
          />
          <Button variant="outline" size="sm" onClick={fetchItems}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Tải lại
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Thêm mới
          </Button>
        </div>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">
            {items.length === 0 ? "Chưa có hàng hóa nào" : "Không tìm thấy kết quả"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã hàng hóa</TableHead>
                <TableHead>Tên hàng hóa</TableHead>
                <TableHead>Đơn vị tính</TableHead>
                <TableHead className="text-right">Giá bán buôn</TableHead>
                <TableHead className="text-right">Giá bán lẻ</TableHead>
                <TableHead className="text-right">Tồn kho</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleEdit(item)}>
                  <TableCell className="font-medium">{item.product_code}</TableCell>
                  <TableCell className="text-primary">{item.product_name}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">{item.wholesale_price?.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-right">{item.retail_price?.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-right font-semibold">{item.stock_quantity || 0}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}>
                      Sửa
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InventoryItemDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingItem={editingItem}
      />
    </div>
  );
};
