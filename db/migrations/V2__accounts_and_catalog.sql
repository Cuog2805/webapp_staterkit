-- V2: Mở rộng tài khoản (vai trò, số điện thoại) và thêm danh mục giải pháp.
-- Database-first: đây là nguồn chân lý cho schema; entity EF Core map vào các bảng này.

-- 1) Tài khoản: thêm định danh đăng nhập theo đặc tả đề (soDienThoai), họ tên, vai trò.
--    Giữ cột email (chuyển sang NULL) vì đăng ký mới không dùng email.
ALTER TABLE users
  MODIFY email VARCHAR(255) NULL,
  ADD COLUMN so_dien_thoai VARCHAR(20) NULL AFTER email,
  ADD COLUMN ho_ten        VARCHAR(100) NULL AFTER password_hash,
  ADD COLUMN vai_tro        VARCHAR(20) NOT NULL DEFAULT 'KHACH_HANG' AFTER ho_ten,
  ADD UNIQUE KEY uq_users_so_dien_thoai (so_dien_thoai);

-- 2) Danh mục giải pháp (CHU_KY_SO, HOA_DON_DT, CAMERA_AI, CLOUD, PHAN_MEM).
CREATE TABLE IF NOT EXISTS solutions (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  ma         VARCHAR(50)  NOT NULL,
  ten        VARCHAR(255) NOT NULL,
  nhom       VARCHAR(30)  NOT NULL,
  don_gia    DECIMAL(18,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_solutions_ma (ma),
  KEY ix_solutions_nhom (nhom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
