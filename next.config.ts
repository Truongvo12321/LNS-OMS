import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Form sản phẩm gửi kèm ảnh (tối đa 2MB) qua server action; mặc định chỉ 1MB
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default nextConfig;
