import { getS3Config } from './s3'
import { getSignedUrl as getS3SignedGetUrl } from '@aws-sdk/s3-request-presigner'
import { getS3Client } from './s3'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl as getCloudFrontSignedUrl } from '@aws-sdk/cloudfront-signer'

export function getCdnConfig() {
  const domain = process.env.CLOUDFRONT_DOMAIN || ''
  const keyId = process.env.CLOUDFRONT_KEY_ID || ''
  const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY || ''
  return { domain, keyId, privateKey }
}

export function hasCloudFront() {
  const { domain } = getCdnConfig()
  return !!domain
}

export async function buildPublicMediaUrl(key: string) {
  const { domain } = getCdnConfig()
  if (domain) {
    return `https://${domain}/${encodeURI(key)}`
  }
  // Fallback to S3 public URL helper
  const { bucket, region } = getS3Config()
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`
}

export async function buildSignedMediaUrl(key: string, expiresSeconds: number = 300) {
  const { domain, keyId, privateKey } = getCdnConfig()
  if (domain) {
    // If keyId and privateKey present, make a CloudFront signed URL; otherwise return public CF URL
    if (keyId && privateKey) {
      const url = `https://${domain}/${encodeURI(key)}`
      const expires = Math.floor(Date.now() / 1000) + expiresSeconds
      return getCloudFrontSignedUrl({
        url,
        keyPairId: keyId,
        privateKey,
        dateLessThan: new Date(expires * 1000).toISOString()
      })
    }
    return `https://${domain}/${encodeURI(key)}`
  }
  // Fallback: S3 presigned GET
  const { bucket } = getS3Config()
  const s3 = getS3Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return await getS3SignedGetUrl(s3, command, { expiresIn: expiresSeconds })
}
