const path = require("path");

const nextConfig = {
  transpilePackages: ["@repo/api-client", "@repo/types", "@repo/validators"],
  webpack: (config) => {
    config.resolve.alias["@tanstack/react-query"] = path.resolve(
      __dirname,
      "../../node_modules/@tanstack/react-query"
    );
    return config;
  },
};

module.exports = nextConfig;
