document.getElementById('create-potato').onclick = function () {
  fetch('/potato', {
    method: 'POST'
  })
  .then(function (response) {
    return response.json();
  })
  .then(function (json) {
    const p = isopod.deserialize(json);
    console.log('cloned potato coming from backend', p);
    attachNewPotato(p);
  });
};

function attachNewPotato (potato) {
  const imgElem = document.createElement('img');
  imgElem.src = '/potato-photo.jpg';
  imgElem.width = potato.weight;
  const growButton = document.createElement('button');
  growButton.innerText = 'Make it grow!';
  growButton.onclick = function () {
    potato.grow(100); // this object comes with .grow on its prototype!
    imgElem.width = potato.weight;
  };
  const container = document.getElementById('potatoes');
  container.appendChild(growButton)
  container.appendChild(imgElem);
}