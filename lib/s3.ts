import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const bucket = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!bucket || !region || !accessKeyId || !secretAccessKey) {
  // In dev, this will surface quickly; in prod, these should always be set
  throw new Error("Missing AWS S3 environment variables");
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

export async function uploadBufferToS3(params: {
  buffer: Buffer;
  key: string;
  contentType?: string;
}) {
  const { buffer, key, contentType } = params;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return {
    key,
    url,
  };
}

