import DisplayClient from "./DisplayClient";

// Màn hình phụ hướng về khách: hiển thị hóa đơn đang tính theo thời gian thực
export default async function DisplayPage({ params }: { params: Promise<{ cashierId: string }> }) {
  const { cashierId } = await params;
  return <DisplayClient cashierId={cashierId} />;
}
