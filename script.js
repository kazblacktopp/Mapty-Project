'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const yearEl = document.querySelector('.year');

// Update copyright year in footer
yearEl.textContent = new Date().getFullYear();

class App {
  #map;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();
    inputType.addEventListener('change', this._toggleElevationField);
    form.addEventListener('submit', this._newWorkout.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Can not retrieve current location.');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();

    // Helper functions
    const isValid = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const isPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Get workout data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If workout is running, create new Running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check data is valid
      if (
        !isValid(distance, duration, cadence) ||
        !isPositive(distance, duration, cadence)
      )
        return alert('Inputs must be valid numbers!');
      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout is cycling, create new Cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      // Check data is valid
      if (
        !isValid(distance, duration, elevation) ||
        !isPositive(distance, duration)
      )
        return alert('Inputs must be valid numbers!');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Display workout marker on map
    this._displayMarker(workout);

    // Display workout on list
    this._displayWorkout(workout);

    // Clear and hide form
    this._resetForm();
  }

  _resetForm() {
    form.classList.add('hidden');
    if (inputType.value === 'cycling') this._toggleElevationField();
    form.reset();
  }

  _displayMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.name}-popup`,
        })
      )
      .setPopupContent(`${workout.workoutIcon} ${workout.description}`)
      .openPopup();
  }

  _displayWorkout(workout) {
    let html = `
      <li class="workout workout--${workout.name}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <div class="workout__details">
          <span class="workout__icon">${workout.workoutIcon}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.name === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.name === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevation}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }
}

class Workout {
  id = (Date.now() + '').slice(-10);
  date = new Date();

  constructor(coords, distance, duration) {
    this.distance = distance; // km
    this.duration = duration; // min
    this.coords = coords; // [lat, lng]
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.name[0].toUpperCase() + this.name.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
    this.workoutIcon = `${this.name === 'running' ? '🏃‍♂️' : '🚴‍♀️'}`;
  }
}

class Running extends Workout {
  name = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence; // steps/min
    this.pace = this.calcPace();
    this._setDescription();
  }

  calcPace() {
    return this.duration / this.distance;
  }
}

class Cycling extends Workout {
  name = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevation = elevationGain; // meters
    this.speed = this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    return this.distance / (this.duration / 60);
  }
}

const app = new App();
