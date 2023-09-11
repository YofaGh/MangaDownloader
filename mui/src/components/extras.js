export const getDate = (datetime) => {
  const date = new Date(datetime);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

export const getDateTime = (datetime) => {
  const date = new Date(datetime);
  return `${date.getFullYear()}/${
    date.getMonth() + 1
  }/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

export const filterDict = (webtoon, filters) => {
  return Object.keys(webtoon)
    .filter((key) => !filters.includes(key))
    .reduce((obj, key) => {
      return Object.assign(obj, {
        [key]: webtoon[key],
      });
    }, {});
};
