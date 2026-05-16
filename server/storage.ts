import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getS3Client(): S3Client {
  return new S3Client({
    region: ENV.awsRegion,
    credentials: {
      accessKeyId: ENV.awsAccessKeyId,
      secretAccessKey: ENV.awsSecretAccessKey,
    },
  });
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  if (!ENV.awsS3Bucket) throw new Error("AWS_S3_BUCKET is not configured");
  const key = relKey.replace(/^\/+/, "");
  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: ENV.awsS3Bucket,
    Key: key,
    Body: typeof data === "string" ? Buffer.from(data) : data,
    ContentType: contentType,
  }));
  const url = `https://${ENV.awsS3Bucket}.s3.${ENV.awsRegion}.amazonaws.com/${key}`;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (!ENV.awsS3Bucket) throw new Error("AWS_S3_BUCKET is not configured");
  const key = relKey.replace(/^\/+/, "");
  const client = getS3Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.awsS3Bucket, Key: key }),
    { expiresIn: 3600 }
  );
  return { key, url };
}
