const words = [
    "Apple",
    "Tiger",
    "Car",
    "Mountain",
    "Laptop",
    "Elephant",
    "Pizza",
    "Guitar",
    "Rainbow",
    "Rocket"
];

function getRandomWords(count = 3) {
    const shuffled = words.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

module.exports = { getRandomWords };