declare module "pdfmake/build/pdfmake" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfmake: any;
  export default pdfmake;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export = pdfmake;
}

declare module "pdfmake/build/vfs_fonts" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vfs: any;
  export default vfs;
}
