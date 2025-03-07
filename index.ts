import express, { type Request, type Response } from "express";
import multer, { diskStorage } from "multer";
import cors from "cors";
import { extname, join } from "path";
import { mkdir, exists, rm } from "node:fs/promises";

const uploadDir = "images";
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

const uploadHandler = (rq: Request, rs: Response) => {
  if (!rq.file) rs.status(400).send("No image uploaded.");
  else rs.json(`${rq.protocol}://${rq.get("host")}/image/${rq.file.filename}`);
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
  .use(route, upload.single("image"))
  .post(route, uploadHandler)
  .delete(route, deleteHandler)
  .listen(port, console.info);
