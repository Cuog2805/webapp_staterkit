-- V4: Dữ liệu mẫu (A1).
-- Tài khoản thử nghiệm: mật khẩu tất cả đều là "password123" (băm BCrypt sẵn bên dưới).

-- 1) Tài khoản: 1 khách hàng, 1 điều hành, 2 kỹ thuật viên.
INSERT INTO users (id, email, so_dien_thoai, password_hash, ho_ten, vai_tro) VALUES
  (1, NULL, '0901000001', '$2b$11$cLccUBVh2xf2LPkT/.63YekKTj1DamcoeepxhCy715hpnIVOHEzIK', N'Nguyễn Văn Khách',   'KHACH_HANG'),
  (2, NULL, '0902000002', '$2b$11$oHVqSSUgEEdoOE8nfXMfF.pxRzX29jbIfSw15CNEZhJNppVvmK2Eq', N'Trần Thị Điều Hành', 'DIEU_HANH'),
  (3, NULL, '0903000003', '$2b$11$FE5ZBrwDaDGVnQgIbDhfvOgmvXBuxjJsAYtd60D/Oa9vYX8q.jYSO', N'Lê Văn Kỹ Thuật 1',  'KY_THUAT'),
  (4, NULL, '0904000004', '$2b$11$d5aQqv6uGzcl7b4HPqBT/eKtznf8hD04gDT1i/Kte1smLGArAbsqa', N'Phạm Văn Kỹ Thuật 2','KY_THUAT');

-- 2) Danh mục giải pháp: 9 giải pháp phủ đủ 5 nhóm.
INSERT INTO solutions (id, ma, ten, nhom, don_gia) VALUES
  (1, 'CKS-CA1',    N'Chữ ký số cá nhân',          'CHU_KY_SO',  500000),
  (2, 'CKS-DN1',    N'Chữ ký số doanh nghiệp',     'CHU_KY_SO',  900000),
  (3, 'HD-DT1',     N'Hóa đơn điện tử',            'HOA_DON_DT', 1200000),
  (4, 'HD-DT2',     N'Hóa đơn điện tử gói lớn',    'HOA_DON_DT', 2500000),
  (5, 'CAM-AI1',    N'Camera AI giám sát',         'CAMERA_AI',  3000000),
  (6, 'CLOUD-SRV1', N'Máy chủ Cloud cơ bản',       'CLOUD',      1500000),
  (7, 'CLOUD-SRV2', N'Máy chủ Cloud nâng cao',     'CLOUD',      4000000),
  (8, 'PM-QL1',     N'Phần mềm quản lý bán hàng',  'PHAN_MEM',   2000000),
  (9, 'PM-QL2',     N'Phần mềm quản lý nhân sự',   'PHAN_MEM',   1800000);

-- 3) Đơn mẫu: 6 đơn ở 5 trạng thái khác nhau.
-- Đơn 1 — HOAN_TAT (3 nhóm, giảm 10% theo ví dụ đề: 4.700.000 -> 4.230.000).
INSERT INTO orders (id, ma_don, khach_hang_id, ktv_id, dia_chi, ngay_hen, trang_thai, tong_tien, giam_gia, thanh_toan, version) VALUES
  (1, 'DH-20261010-0001', 1, 3, N'123 Trần Hưng Đạo, Ninh Bình', '2026-10-26', 'HOAN_TAT',        4700000,  470000, 4230000, 3);
INSERT INTO order_items (don_id, giai_phap_id, nhom, don_gia, so_luong, thanh_tien) VALUES
  (1, 5, 'CAMERA_AI', 3000000, 1, 3000000),
  (1, 1, 'CHU_KY_SO',  500000, 1,  500000),
  (1, 3, 'HOA_DON_DT',1200000, 1, 1200000);
INSERT INTO order_status_history (don_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien_id, ly_do, created_at) VALUES
  (1, NULL, 'MOI', 1, NULL, '2026-10-19 08:00:00'),
  (1, 'MOI', 'DA_TIEP_NHAN', 2, NULL, '2026-10-19 09:00:00'),
  (1, 'DA_TIEP_NHAN', 'DANG_TRIEN_KHAI', 2, NULL, '2026-10-19 10:00:00'),
  (1, 'DANG_TRIEN_KHAI', 'HOAN_TAT', 3, NULL, '2026-10-20 15:00:00');

-- Đơn 2 — DANG_TRIEN_KHAI (1 nhóm CLOUD, không giảm).
INSERT INTO orders (id, ma_don, khach_hang_id, ktv_id, dia_chi, ngay_hen, trang_thai, tong_tien, giam_gia, thanh_toan, version) VALUES
  (2, 'DH-20261010-0002', 1, 4, N'45 Lê Hồng Phong, Ninh Bình', '2026-10-27', 'DANG_TRIEN_KHAI', 7000000, 0, 7000000, 2);
INSERT INTO order_items (don_id, giai_phap_id, nhom, don_gia, so_luong, thanh_tien) VALUES
  (2, 7, 'CLOUD', 4000000, 1, 4000000),
  (2, 6, 'CLOUD', 1500000, 2, 3000000);
INSERT INTO order_status_history (don_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien_id, ly_do, created_at) VALUES
  (2, NULL, 'MOI', 1, NULL, '2026-10-19 08:10:00'),
  (2, 'MOI', 'DA_TIEP_NHAN', 2, NULL, '2026-10-19 09:10:00'),
  (2, 'DA_TIEP_NHAN', 'DANG_TRIEN_KHAI', 2, NULL, '2026-10-19 10:10:00');

-- Đơn 3 — DA_TIEP_NHAN (1 nhóm PHAN_MEM, không giảm), chưa phân công KTV.
INSERT INTO orders (id, ma_don, khach_hang_id, ktv_id, dia_chi, ngay_hen, trang_thai, tong_tien, giam_gia, thanh_toan, version) VALUES
  (3, 'DH-20261010-0003', 1, NULL, N'78 Nguyễn Huệ, Ninh Bình', '2026-10-28', 'DA_TIEP_NHAN', 3800000, 0, 3800000, 1);
INSERT INTO order_items (don_id, giai_phap_id, nhom, don_gia, so_luong, thanh_tien) VALUES
  (3, 8, 'PHAN_MEM', 2000000, 1, 2000000),
  (3, 9, 'PHAN_MEM', 1800000, 1, 1800000);
INSERT INTO order_status_history (don_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien_id, ly_do, created_at) VALUES
  (3, NULL, 'MOI', 1, NULL, '2026-10-19 08:20:00'),
  (3, 'MOI', 'DA_TIEP_NHAN', 2, NULL, '2026-10-19 09:20:00');

-- Đơn 4 — MOI (2 nhóm, giảm 5%).
INSERT INTO orders (id, ma_don, khach_hang_id, ktv_id, dia_chi, ngay_hen, trang_thai, tong_tien, giam_gia, thanh_toan, version) VALUES
  (4, 'DH-20261010-0004', 1, NULL, N'90 Đinh Tiên Hoàng, Ninh Bình', '2026-10-29', 'MOI', 3000000, 150000, 2850000, 0);
INSERT INTO order_items (don_id, giai_phap_id, nhom, don_gia, so_luong, thanh_tien) VALUES
  (4, 2, 'CHU_KY_SO', 900000, 2, 1800000),
  (4, 3, 'HOA_DON_DT', 1200000, 1, 1200000);
INSERT INTO order_status_history (don_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien_id, ly_do, created_at) VALUES
  (4, NULL, 'MOI', 1, NULL, '2026-10-19 08:30:00');

-- Đơn 5 — HUY (khách tự hủy, có lý do).
INSERT INTO orders (id, ma_don, khach_hang_id, ktv_id, dia_chi, ngay_hen, trang_thai, tong_tien, giam_gia, thanh_toan, version) VALUES
  (5, 'DH-20261010-0005', 1, NULL, N'12 Vân Giang, Ninh Bình', '2026-10-30', 'HUY', 3000000, 0, 3000000, 1);
INSERT INTO order_items (don_id, giai_phap_id, nhom, don_gia, so_luong, thanh_tien) VALUES
  (5, 5, 'CAMERA_AI', 3000000, 1, 3000000);
INSERT INTO order_status_history (don_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien_id, ly_do, created_at) VALUES
  (5, NULL, 'MOI', 1, NULL, '2026-10-19 08:40:00'),
  (5, 'MOI', 'HUY', 1, N'Khách thay đổi nhu cầu', '2026-10-19 11:00:00');

-- Đơn 6 — HOAN_TAT (4 nhóm, giảm 10%).
INSERT INTO orders (id, ma_don, khach_hang_id, ktv_id, dia_chi, ngay_hen, trang_thai, tong_tien, giam_gia, thanh_toan, version) VALUES
  (6, 'DH-20261010-0006', 1, 3, N'34 Trương Hán Siêu, Ninh Bình', '2026-10-26', 'HOAN_TAT', 9000000, 900000, 8100000, 3);
INSERT INTO order_items (don_id, giai_phap_id, nhom, don_gia, so_luong, thanh_tien) VALUES
  (6, 4, 'HOA_DON_DT', 2500000, 1, 2500000),
  (6, 8, 'PHAN_MEM',   2000000, 1, 2000000),
  (6, 5, 'CAMERA_AI',  3000000, 1, 3000000),
  (6, 6, 'CLOUD',      1500000, 1, 1500000);
INSERT INTO order_status_history (don_id, tu_trang_thai, den_trang_thai, nguoi_thuc_hien_id, ly_do, created_at) VALUES
  (6, NULL, 'MOI', 1, NULL, '2026-10-18 08:00:00'),
  (6, 'MOI', 'DA_TIEP_NHAN', 2, NULL, '2026-10-18 09:00:00'),
  (6, 'DA_TIEP_NHAN', 'DANG_TRIEN_KHAI', 2, NULL, '2026-10-18 10:00:00'),
  (6, 'DANG_TRIEN_KHAI', 'HOAN_TAT', 3, NULL, '2026-10-19 16:00:00');
