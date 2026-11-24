# LazyReader

Extension Chrome (Manifest V3) giúp **tự động cuộn trang khi đọc truyện**. Bạn chỉ cần bấm bắt đầu, extension sẽ cuộn mượt từng đoạn sau mỗi vài giây, chờ ảnh lazy-load tải xong rồi mới cuộn tiếp, để bạn không phải tự lăn chuột.

## Tính năng

- Cuộn mượt (easing ease-in-out) theo chu kỳ **3–20 giây** do bạn chọn.
- Chỉnh **độ dài mỗi lần cuộn** từ 30% đến 100% chiều cao màn hình.
- **Chờ ảnh lazy-load**: không cuộn tiếp khi ảnh trong vùng nhìn thấy chưa tải xong (tối đa 6 giây mỗi lần, ảnh lỗi sẽ bị bỏ qua).
- **Tự tạm dừng khi bạn cuộn tay** (lăn chuột, chạm màn hình, phím mũi tên / PageUp / PageDown / Home / End / Space).
- Tự dừng khi tới cuối trang.
- Tự nhận diện vùng cuộn: cuộn cả trang hoặc một khung có scrollbar riêng.
- Bảng điều khiển nổi dùng Shadow DOM nên không bị CSS của trang web làm hỏng.
- Lưu cài đặt bằng `chrome.storage`.

## Cài đặt (chế độ nhà phát triển)

1. Tải hoặc clone repo này:
   ```bash
   git clone <url-repo-cua-ban>
   ```
2. Mở `chrome://extensions` trong Chrome (hoặc Edge, Brave, Cốc Cốc).
3. Bật **Developer mode** (Chế độ dành cho nhà phát triển) ở góc trên bên phải.
4. Bấm **Load unpacked** (Tải tiện ích đã giải nén) và chọn thư mục `lazyreader/` bên trong repo, là thư mục chứa `manifest.json`.

## Cách dùng

1. Mở trang truyện muốn đọc.
2. Bấm biểu tượng **LazyReader** trên thanh công cụ để hiện/ẩn bảng điều khiển ở góc dưới bên phải.
3. Bấm **Bắt đầu** (hoặc phím tắt **Alt+S**) để chạy, bấm lại để dừng.
4. Kéo thanh trượt để chỉnh:
   - **Sang trang mới**: số giây nghỉ giữa hai lần cuộn.
   - **Mỗi lần cuộn**: % chiều cao màn hình cuộn mỗi lượt.

> Nếu biểu tượng hiện dấu `!`, trang được mở trước khi cài extension. Hãy tải lại trang (F5) rồi bấm lại. Extension không chạy trên các trang hệ thống như `chrome://` hay Chrome Web Store.

## Cấu trúc dự án

```
lazyreader/
├── manifest.json   # Khai báo extension (MV3), quyền "storage"
├── background.js   # Service worker: bấm icon -> gửi lệnh mở/đóng bảng điều khiển
└── content.js      # Toàn bộ logic: giao diện, tìm vùng cuộn, cuộn mượt, chờ ảnh
```

## Cách hoạt động

Mỗi vòng lặp của `content.js` làm 4 bước:

1. **Tìm vùng cuộn**: ưu tiên cuộn cả trang, nếu không thì chọn phần tử `overflow: auto/scroll` có diện tích lớn nhất.
2. **Cuộn mượt** bằng `requestAnimationFrame` đến vị trí đích (`step`% chiều cao khung nhìn).
3. **Chờ ảnh**: kiểm tra các ảnh đang nằm trong vùng nhìn (cộng thêm nửa màn hình phía dưới), đợi đến khi `complete` hoặc quá 6 giây.
4. **Đếm ngược** `interval` giây rồi lặp lại, hoặc dừng nếu đã tới cuối.

Mọi thao tác thật của người dùng (`isTrusted`) như wheel, touch hay phím điều hướng sẽ làm tăng `token` để huỷ vòng lặp đang chạy.

## Quyền & quyền riêng tư

- `storage`: chỉ để lưu hai thiết lập (khoảng nghỉ và độ dài cuộn) trên máy bạn.
- Content script khớp `http://*/*` và `https://*/*` để dùng được trên mọi web truyện. Extension **không gửi bất kỳ dữ liệu nào ra ngoài**, không có yêu cầu mạng nào.

## Hướng phát triển

- [ ] Thêm icon cho extension (16/32/48/128 px).
- [ ] Tuỳ chỉnh phím tắt.
- [ ] Lưu cấu hình riêng theo từng trang web.
- [ ] Tự bấm nút "Chương sau" khi tới cuối chương.

## Giấy phép

[MIT](LICENSE)
