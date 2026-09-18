# Implementation Plan Rule (Bắt Buộc Lập Kế Hoạch Triển Khai)

Quy tắc bắt buộc đối với mọi tác vụ triển khai hoặc chỉnh sửa mã nguồn trong toàn bộ repository theo chỉ đạo của Người dùng.

## 1. Quy tắc cốt lõi:

Khi nhận yêu cầu thay đổi mã nguồn, thêm tính năng mới, tái cấu trúc, tối ưu hoặc sửa lỗi:

1. **Nghiên cứu & Khảo sát (Research Phase)**:
   - Đọc kỹ codebase, tìm hiểu sâu các phụ thuộc, kiến trúc và nguyên nhân gốc rễ.
   - **TUYỆT ĐỐI KHÔNG** sửa code, không chạy các lệnh ghi đè hoặc thay đổi file dự án trong giai đoạn này.

2. **Lập Artifact `implementation_plan.md`**:
   - Tạo hoặc cập nhật artifact `implementation_plan.md` với đầy đủ cấu trúc:
     - **Goal Description**: Mục tiêu và phạm vi thay đổi.
     - **User Review Required**: Các điểm quan trọng hoặc thay đổi cấu trúc cần người dùng lưu ý.
     - **Open Questions**: Câu hỏi làm rõ yêu cầu (nếu có).
     - **Proposed Changes**: Phân loại theo từng file (`[NEW]`, `[MODIFY]`, `[DELETE]`) với nội dung thay đổi rõ ràng.
     - **Verification Plan**: Kịch bản kiểm tra tự động và kiểm thử trực quan.
   - Metadata bắt buộc: `RequestFeedback: true`, `UserFacing: true`.

3. **Dừng Lại Chờ Phê Duyệt (Stop & Await Approval)**:
   - DỪNG LẠI mọi hành động ghi code và CHỜ người dùng bấm **Proceed** hoặc phản hồi xác nhận kế hoạch trước khi bắt đầu thực thi.

4. **Thực Thi & Kiểm Thử (Execute & Verify)**:
   - Sau khi nhận được sự đồng ý, tiến hành sửa code theo đúng kế hoạch đã chốt.
   - Chạy build/compile, kiểm thử tự động (Playwright/Node/Jest...) trên môi trường thực tế.
   - Đồng bộ file dẫn xuất (`extract-legacy.mjs` nếu có).
   - Tạo hoặc cập nhật `walkthrough.md` tổng kết kết quả kiểm thử có số liệu và ảnh minh chứng.

## 2. Phạm vi áp dụng (Scope):
- Áp dụng cho toàn bộ các tác vụ build code, thêm tính năng, sửa lỗi logic trên tất cả các app và package trong monorepo.
