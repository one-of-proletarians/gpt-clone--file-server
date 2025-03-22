import express, { type Request, type Response } from "express";
import multer, { diskStorage } from "multer";
import cors from "cors";
import { extname, join } from "path";
import { mkdir, exists, rm } from "node:fs/promises";
import sharp from "sharp";

const uploadDir = "images";
const maxSize = 1500;
const rand = () => Math.random().toString(24).slice(2, 8);
const port = process.env.PORT || 3000;
const route = "/image";
const destination = join(__dirname, uploadDir);

const upload = multer({
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
    let resize: Array<number | null>;

    if (Math.max(width!, height!) > maxSize) {
      if (width! > height!) {
        resize = [maxSize, null];
      } else {
        resize = [null, maxSize];
      }

      const filename = `${rand()}.${format}`;
      const filepath = join(__dirname, "images", filename);
      await image.resize(...resize).toFile(filepath);
      await rm(rq.file.path);

      rs.json(`${rq.protocol}://${rq.get("host")}/image/${filename}`);
    } else {
      rs.json(`${rq.protocol}://${rq.get("host")}/image/${rq.file.filename}`);
    }
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
