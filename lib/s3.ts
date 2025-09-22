import { S3Client, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export function getS3Config() {
  const bucket = process.env.S3_BUCKET || ''
  const region = process.env.S3_REGION || process.env.AWS_REGION || ''
  const accessKeyId = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || ''
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || ''
  const endpoint = process.env.S3_ENDPOINT || undefined
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true'

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing S3 configuration. Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY')
  }

  return { bucket, region, accessKeyId, secretAccessKey, endpoint, forcePathStyle }
}

export function getS3Client() {
  const { region, accessKeyId, secretAccessKey, endpoint, forcePathStyle } = getS3Config()
  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    endpoint,
    forcePathStyle
  })
}

export async function createUploadPresignedPost(options: {
  key: string
  contentType: string
  maxSizeBytes: number
  expiresSeconds?: number
}) {
  const { bucket } = getS3Config()
  const s3 = getS3Client()

  const expires = options.expiresSeconds ?? 300
  const conditions: any[] = [
    ['content-length-range', 0, options.maxSizeBytes],
    { 'Content-Type': options.contentType },
    ['starts-with', '$key', options.key]
  ]

  const result = await createPresignedPost(s3, {
    Bucket: bucket,
    Key: options.key,
    Conditions: conditions,
    Fields: {
      'Content-Type': options.contentType
    },
    Expires: expires
  })

  return result
}

export async function getPresignedGetUrl(key: string, expiresSeconds: number = 3600) {
  const { bucket } = getS3Config()
  const s3 = getS3Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  return await getSignedUrl(s3, command, { expiresIn: expiresSeconds })
}

export function publicUrlForKey(key: string) {
  const { bucket, region } = getS3Config()
  // Basic public URL for standard AWS; for custom endpoints, prefer presigned get
  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`
}

export async function deleteObjectByKey(key: string) {
  const { bucket } = getS3Config()
  const s3 = getS3Client()
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}


