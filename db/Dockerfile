# Image "migrate" cho production: Flyway + migration được đóng gói sẵn.
# Lý do không mount thư mục như bản dev: mỗi bản deploy là một image có tag cố định,
# nên biết chính xác migration nào đi cùng phiên bản code nào, và server không cần mã nguồn.
# Chỉ chứa migrations/ — KHÔNG có seed/ (dữ liệu mẫu, tài khoản mật khẩu cố định).
FROM flyway/flyway:11
COPY migrations /flyway/sql
ENTRYPOINT ["flyway"]
CMD ["migrate"]
