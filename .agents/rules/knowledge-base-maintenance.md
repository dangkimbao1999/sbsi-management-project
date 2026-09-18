# Knowledge Base Maintenance

Chủ động cập nhật tài liệu dự án để đảm bảo tri thức được tích lũy liên tục qua từng session.

## Do:

- Sau khi hoàn thành 1 task có ý nghĩa trên 1 app (tính năng mới, quyết định kiến trúc, đổi luồng dữ liệu, workaround/hạn chế mới phát hiện, việc còn dang dở cần làm tiếp...), **chủ động cập nhật `apps/<app>/AGENTS.md`** — không đợi người dùng nhắc nhở.
- Ưu tiên ghi:
  - Quyết định kiến trúc & lý do (không chỉ "làm gì" mà cả "tại sao").
  - Hạn chế kỹ thuật hoặc việc đang dang dở (env var còn thiếu, API mock, TODO cụ thể).
  - Context nghiệp vụ SBSI mà người dùng vừa giải thích (không suy ra được từ code thuần túy).
- Cập nhật bảng "Danh sách app hiện có" ở root `AGENTS.md` nếu có app mới.
- Chỉnh sửa/ghi đè các phần liên quan thay vì chỉ append vô hạn.
- Báo ngắn gọn cho người dùng biết đã cập nhật `AGENTS.md`.

## Do not:

- Bịa thông tin chưa được xác nhận.
- Ghi chép chi tiết vụn vặt suy ra được từ việc đọc code (tên biến, cấu trúc hàm đơn giản).
- Viết theo dạng nhật ký thay đổi ("Hôm nay đã làm...") — `AGENTS.md` phản ánh trạng thái HIỆN TẠI của dự án.

## Scope & Applicability:

- Tự động kiểm tra sau mỗi session có thay đổi quan trọng trên các app trong thư mục `apps/`.
