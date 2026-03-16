import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

export default function ImportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Import dữ liệu" description="Phase 2 sẽ xử lý import file .xlsx từ cột A theo spec đã chốt." />
      <Card>
        <p className="text-sm text-slate-600">
          Trang này đã được giữ chỗ. Ở phase tiếp theo sẽ có upload file, chuẩn hóa 9 số cuối, kiểm tra trùng lặp và danh sách số bị trùng.
        </p>
      </Card>
    </div>
  );
}
