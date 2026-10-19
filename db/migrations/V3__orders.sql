-- V3: Đơn đăng ký, chi tiết đơn, lịch sử trạng thái.

CREATE TABLE IF NOT EXISTS orders (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  ma_don          VARCHAR(20) NOT NULL,                 -- DH-yyyyMMdd-nnnn
  khach_hang_id   BIGINT NOT NULL,                      -- chủ đơn (users.vai_tro = KHACH_HANG)
  ktv_id          BIGINT NULL,                          -- kỹ thuật viên được giao
  dia_chi         VARCHAR(255) NOT NULL,
  ngay_hen        DATE NOT NULL,
  trang_thai      VARCHAR(20) NOT NULL DEFAULT 'MOI',   -- MOI/DA_TIEP_NHAN/DANG_TRIEN_KHAI/HOAN_TAT/HUY
  tong_tien       DECIMAL(18,2) NOT NULL DEFAULT 0,
  giam_gia        DECIMAL(18,2) NOT NULL DEFAULT 0,
  thanh_toan      DECIMAL(18,2) NOT NULL DEFAULT 0,
  version         INT NOT NULL DEFAULT 0,               -- optimistic lock (B4)
  idempotency_key VARCHAR(100) NULL,                    -- chống tạo trùng đơn (B4)
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orders_ma_don (ma_don),
  UNIQUE KEY uq_orders_idempotency_key (idempotency_key),
  KEY ix_orders_khach_hang (khach_hang_id),
  KEY ix_orders_ktv (ktv_id),
  KEY ix_orders_trang_thai (trang_thai),
  CONSTRAINT fk_orders_khach_hang FOREIGN KEY (khach_hang_id) REFERENCES users (id),
  CONSTRAINT fk_orders_ktv        FOREIGN KEY (ktv_id)        REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  don_id        BIGINT NOT NULL,
  giai_phap_id  BIGINT NOT NULL,
  nhom          VARCHAR(30) NOT NULL,                   -- snapshot nhóm lúc đặt
  don_gia       DECIMAL(18,2) NOT NULL,                 -- snapshot đơn giá lúc đặt
  so_luong      INT NOT NULL,                           -- 1..100
  thanh_tien    DECIMAL(18,2) NOT NULL,
  KEY ix_order_items_don (don_id),
  KEY ix_order_items_giai_phap (giai_phap_id),
  CONSTRAINT fk_order_items_don       FOREIGN KEY (don_id)       REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_giai_phap FOREIGN KEY (giai_phap_id) REFERENCES solutions (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_status_history (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  don_id             BIGINT NOT NULL,
  tu_trang_thai      VARCHAR(20) NULL,
  den_trang_thai     VARCHAR(20) NOT NULL,
  nguoi_thuc_hien_id BIGINT NULL,
  ly_do              VARCHAR(255) NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY ix_history_don (don_id),
  CONSTRAINT fk_history_don   FOREIGN KEY (don_id)             REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_history_nguoi FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
