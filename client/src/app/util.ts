const env = process.env.NODE_ENV || 'development';
const publicPath = env === 'development' ? '' : '/go-mp/';

const getPublicPath = (path: string) => publicPath + path;

export { getPublicPath };