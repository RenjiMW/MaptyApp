'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + ``).slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)}
     on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

// ======= RUNNING CLASS ==========
class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

// ======= CYCLING CLASS ==========
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/min
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const modal = document.querySelector('.modal');
const modalBtn = document.querySelector('.closeModalBtn');

let editing = false;
let secondClick = 0;
let currentWorkoutSelcted;

// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #clickEvent;
  #workouts = []; // array containig coolection of data from workouts
  #markersArray = [];

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // ATTACH EVENT HANDLERS
    // Submitting the form
    form.addEventListener('submit', this._newWorkout.bind(this));

    // Toggle input field
    inputType.addEventListener('change', this._toggleElevationField);

    containerWorkouts.addEventListener('click', this._moveToPop.bind(this));
    // prettier-ignore
    containerWorkouts.addEventListener('click', this._addEditWorkoutBtn.bind(this));
    containerWorkouts.addEventListener('click', this._removeWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._removeAll.bind(this));
    containerWorkouts.addEventListener('click', this._sort.bind(this));
    modalBtn.addEventListener('click', this._closeModal);
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function (error) {
          alert(error.message);
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(this.#map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._eventsWhenMapClicked.bind(this));
    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _eventsWhenMapClicked(clickE) {
    editing = false;
    secondClick = 0;
    this._showForm(clickE);
    this._removeEditSelection();
  }

  _showForm(clickE) {
    this.#clickEvent = clickE;

    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Clear form values after submitting
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    // hide form
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _showModal() {
    modal.style.display = 'block';
  }

  _closeModal() {
    modal.style.display = 'none';
  }

  _newWorkout(e) {
    e.preventDefault();

    // Used variables
    let lat;
    let lng;
    let workout;

    // function used later for replace workout when edited
    const replaceWorkout = workout => {
      // find old workout and assign it to variable + use old id and time for new workout
      const workoutOld = this.#workouts.find(
        work => work.id === this.#clickEvent.id
      );
      workout.id = workoutOld.id;
      const dateOfWorkout = new Date(`${workoutOld.date}`);
      workout.date = dateOfWorkout;
      // replace old workout with new (edited) workout
      this.#workouts.splice(this.#workouts.indexOf(workoutOld), 1, workout);
    };

    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // Declaration of checked conditions
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // Assigning coordinates depending on the activity (new training/editing of an existing one)
    if (editing === false) {
      lat = this.#clickEvent.latlng.lat;
      lng = this.#clickEvent.latlng.lng;
    } else if (editing === true) {
      lat = this.#clickEvent.coords[0];
      lng = this.#clickEvent.coords[1];
      secondClick = 0;
    }

    // Check if data is valid (for runninng type)
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        this._showModal();
        return; // alert('Inputs have to be positive numbers');
      }

      workout = new Running([lat, lng], distance, duration, cadence);
      if (editing === false) {
        // adding new workout to array
        this.#workouts.push(workout);
      } else if (editing === true) {
        // find old workout and assign it to variable + use old id and time for new workout
        replaceWorkout(workout);
      }
    }

    // Check if data is valid (for cycling type)
    if (type === 'cycling') {
      const elevation =
        inputElevation.value === '' ? '' : +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        this._showModal();
        return; //alert('Inputs have to be positive numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
      if (editing === false) {
        // adding new workout to array
        this.#workouts.push(workout);
      } else if (editing === true) {
        replaceWorkout(workout);
      }
    }

    // Adding marker on map after submiting the form
    this._renderWorkoutMarker(workout);

    // Render info about workout on the list
    this._renderWorkout(workout);

    // delete form discription about editing
    this._removeEditSelection();

    // Form hideing after submitting the form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
    editing = false;
  }

  // Adding marker on map after submiting the form
  _renderWorkoutMarker(workout) {
    let marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWith: 250,
          max: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();

    // add "id" property because we will sort workouts
    // so index in workouts array is insufficient for this operation
    marker.id = `${workout.id}`;

    // add new marker to markersArray
    if (editing === false) this.#markersArray.push(marker);

    // replace workout marker if currenty editing workout
    if (editing === true) {
      // find marker to replace by id
      // because index of workout in array could have been changed by sorting
      const markerToReplace = this.#markersArray.find(
        mark => mark.id === marker.id
      );
      // find index of this specific marker
      const markerIndex = this.#markersArray.indexOf(markerToReplace);

      // remove marker from html
      markerToReplace.remove();

      // replace marker object inside markersArray
      this.#markersArray.splice(markerIndex, 1, marker);
    }
  }

  _renderWorkout(workout) {
    let wotkoutHTML =
      // prettier-ignore
      `<li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>


        <div class="dropdown">
          <button class="dropbtn">Options</button>
          <div class="dropdown-content">
            <a class="editWorkoutBtn">Edit 🔧</a>
            <a class="deleteBtn">Delete ❌</a>
            <a class="deleteAllBtn">Delete All 🔥</a>
            <div class="side-parent">
              <a class="sortBtn ">Sort 📚</a> 
              <div class="side-child">
                <a class="distanceBtn">by distance 🗺</a>
                <a class="durationBtn">by duration ⏱</a>
                <a class="typeBtn"> by type 😎</a>
              </div>
            </div>
          </div>
        </div>



        <div class="workout__details">
          <span class="workout__icon">${(workout.type === 'running'? "🏃": "🚴‍♀️")}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;

    // RUNNING
    // prettier-ignore
    if (workout.type === 'running') {
      wotkoutHTML+=
        `<div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${Math.round(workout.pace)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🦶🏼</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>`;
    }

    // CYCLING
    // prettier-ignore
    if (workout.type === 'cycling') {
      wotkoutHTML+=
        `<div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${Math.round(workout.speed)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>`;
    }

    if (editing === false) {
      form.insertAdjacentHTML('afterend', wotkoutHTML);
    } else if (editing === true) {
      const workoutToEdit = document.querySelector(`[data-id="${workout.id}"]`);
      workoutToEdit.outerHTML = wotkoutHTML;
    }
  } // ---- END OF _renderWorkout ---

  _moveToPop(e) {
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    let workoutsTemp = [];
    let workout;

    for (const work of data) {
      if (work.type === 'running') {
        workout = new Running(
          work.coords,
          work.distance,
          work.duration,
          work.cadence
        );
      }
      if (work.type === 'cycling') {
        workout = new Cycling(
          work.coords,
          work.distance,
          work.duration,
          work.elevationGain
        );
      }
      workout.id = work.id;
      const dateOfWorkout = new Date(`${work.date}`);
      workout.date = dateOfWorkout;
      workoutsTemp.push(workout);
    }

    this.#workouts = workoutsTemp;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _addEditWorkoutBtn(e) {
    const editBtn = e.target.closest('.editWorkoutBtn');
    const workoutEl = editBtn?.closest('.workout');

    if (!editBtn) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (currentWorkoutSelcted === undefined) {
      currentWorkoutSelcted = workout;
      secondClick++;
    } else if (currentWorkoutSelcted === workout && secondClick !== 2) {
      secondClick++;
    } else if (currentWorkoutSelcted !== workout) {
      currentWorkoutSelcted = workout;
      secondClick = 1;
    }

    if (secondClick < 2) {
      editing = true;
      // Allow editing
      // remove 'workoutEditeing' class form all workouts from list and remove editing description from form
      this._removeEditSelection();
      // add css style to currently editing workout
      workoutEl.classList.add('workoutEditeing');
      // show form and have currently editeing workout data in memory
      this._showForm(workout);
      // add decsription to form and adjusting form height
      this._editingText(workout);
    } else {
      // if (secondClick === 2): Switch off editing
      // delete form discription about editing
      this._removeEditSelection();
      secondClick = 0;
      editing = false;
      this._hideForm();
    }
  }

  _removeEditSelection() {
    const allWorkouts = document.querySelectorAll('.workout');
    const editHTML = document.querySelector('.editText');
    allWorkouts.forEach(workout => workout.classList.remove('workoutEditeing'));
    form.classList.remove('editing'); // remove additional height setting
    editHTML?.remove(); // remove editing description
  }

  _editingText(workout) {
    const htmlEditing = `<p class="editText" style="font-weight: bold; font-size: 1.3em; grid-column-start: 1;
    grid-column-end: span 2;">Edite ${workout.description}</p>`;
    form.classList.add('editing');
    form.insertAdjacentHTML('afterbegin', htmlEditing);
  }

  _removeWorkout(e) {
    const deleteBtn = e.target.closest('.deleteBtn');
    const workoutEl = deleteBtn?.closest('.workout');

    if (!deleteBtn) return;

    // find a workout object that matches an item in the rendered list
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    // remove marker from html and markersArray
    this.#markersArray[this._findWorkoutIndex(workout)].remove();
    this.#markersArray.splice(this._findWorkoutIndex(workout), 1);

    // remove workout from list
    workoutEl.remove();

    // remove workout from workouts array
    this.#workouts.splice(this._findWorkoutIndex(workout), 1);

    // delete workout from local storage
    this._setLocalStorage();
  }

  _findWorkoutIndex(workout) {
    const indexOfWorkout = this.#workouts.indexOf(workout);
    return indexOfWorkout;
  }

  _removeAll(e) {
    // set a variable with element which was the target of clicking and had 'deleteAllBtn' class,
    const deleteAllBtn = e.target.closest('.deleteAllBtn');

    if (!deleteAllBtn) return;

    // clear #workouts array
    this.#workouts = [];

    // clear localStorage
    localStorage.clear();

    // clear HTML workouts list and markers
    const workoutsQty = containerWorkouts.children.length;
    for (let i = workoutsQty - 1; i > 0; i--) {
      containerWorkouts.children[i].remove();
      this.#markersArray[i - 1].remove();
    }

    // clear markersArray
    this.#markersArray = [];
  }

  _sort(e) {
    const distanceBtn = e.target.closest('.distanceBtn');
    const durationBtn = e.target.closest('.durationBtn');
    const typeBtn = e.target.closest('.typeBtn');

    if (!distanceBtn & !durationBtn & !typeBtn) return;
    console.log("Sorting by distance is currently 'being developed'");

    this.#workouts.sort(compare);

    function compare(a, b) {
      if (distanceBtn) {
        return a.distance - b.distance;
      }
      if (durationBtn) {
        return a.duration - b.duration;
      }
      if (typeBtn) {
        if (a.type < b.type) {
          return -1;
        }
        if (a.type > b.type) {
          return 1;
        }
        return 0;
      }
    }

    // assigning an attribute containing the workout index
    for (let i = 0; i < this.#workouts.length; i++) {
      const workoutEl = containerWorkouts.children[i + 1];
      const workout = this.#workouts.find(
        work => work.id === workoutEl.dataset.id
      );
      workoutEl.dataset.workoutIndex = `${this._findWorkoutIndex(workout)}`;
    }

    // Arranging the list of trainings in HTML according to the new index
    for (let i = 0; i < this.#workouts.length; i++) {
      const workoutEl = document.querySelector(`[data-workout-index="${i}"]`);
      containerWorkouts.children[0].after(workoutEl);
    }
  }
}

const app = new App();
