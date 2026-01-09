// AWS設定
export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: 'ap-northeast-1_Z4r3hFLyg',
      userPoolClientId: '38rkdehf5s8euviarfkth5puk',
      signUpVerificationMethod: 'code' as const,
    },
  },
};

// API設定
export const apiConfig = {
  baseUrl: 'https://3eal2nthgc.execute-api.ap-northeast-1.amazonaws.com/v1',
};

// CloudFront URL（画像用）
export const cdnConfig = {
  imageBaseUrl: 'https://d8l6v2r98r1en.cloudfront.net',
};

// S3設定
export const s3Config = {
  bucket: 'loafer-product-images-917086196108',
  region: 'ap-northeast-1',
};

