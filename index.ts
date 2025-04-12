import express, { type Request, type Response } from "express";
import multer, { diskStorage } from "multer";
import cors from "cors";
import { extname, join } from "path";
import { mkdir, exists, rm } from "node:fs/promises";
import sharp from "sharp";

const uploadDir = "images";
const rand = () => Math.random().toString(24).slice(2, 8);
const port = process.env.PORT || 3000;
const route = "/image";
const destination = join(__dirname, uploadDir);

const upload = multer({
  limits: {
    fileSize: 9999999999,
  },
  storage: diskStorage({
    destination,
    filename: (_, f, cb) => cb(null, rand() + extname(f.originalname)),
  }),
});

const uploadHandler = async (rq: Request, rs: Response) => {
  if (!rq.file) rs.status(400).send("No image uploaded.");
  else {
    const image = sharp(rq.file.path);
    const { width, height, format } = await image.metadata();

    const filename = `${rand()}.${format}`;
    const filepath = join(__dirname, "images", filename);
    await image
      .resize(resizeImageIfNeeded(width!, height!, 512, 4))
      .toFile(filepath);
    await rm(rq.file.path);

    rs.json(`${rq.protocol}://${rq.get("host")}/image/${filename}`);
  }
};

const deleteHandler = async (rq: Request, rs: Response) => {
  if (rq.query.name) {
    await rm(join(__dirname, "images", rq.query.name as string));
    rs.send("ok");
  } else {
    rs.status(400).send("fail");
  }
};

if (!(await exists(uploadDir))) await mkdir(uploadDir);

express()
  .use(cors())
  .use(route, express.static(destination))
  .post(route, upload.single("image"), uploadHandler)
  .delete(route, deleteHandler)
  .listen(port, console.info);

function calculateTiles(width: number, height: number, tileSize: number) {
  const tilesWide = Math.ceil(width / tileSize);
  const tilesHigh = Math.ceil(height / tileSize);
  return tilesWide * tilesHigh;
}

function resizeImageIfNeeded(
  width: number,
  height: number,
  tileSize: number,
  maxTiles: number,
) {
  const currentTileCount = calculateTiles(width, height, tileSize);

  if (currentTileCount > maxTiles) {
    const scaleFactor = Math.sqrt(currentTileCount / maxTiles);
    const newWidth = Math.floor(width / scaleFactor);
    const newHeight = Math.floor(height / scaleFactor);

    return { width: newWidth, height: newHeight };
  } else {
    return { width, height };
  }
}
