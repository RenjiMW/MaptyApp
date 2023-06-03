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
const runningOption = document.querySelector('#running');
const cyclingOption = document.querySelector('#cycling');
let editing = false;
let secondClick = 0;
let currentWorkoutSelcted;

// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #clickEvent;
  #workouts = []; // array containig coolection of data from workouts

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
    containerWorkouts.addEventListener(
      'click',
      this._addEditWorkoutBtn.bind(this)
    );
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

    /* Loging to console
    console.log(`Your position on map has been loaded with function _loadMap 
    passed in to method _getPosition() when succesfully get perission to get data
    _loadMap accepts an argument of position object, here is how it looks like: `);
    console.log(position);
    */

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(this.#map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on map
    this.#map.on('click', this._eventsWhenMapClicked.bind(this));
    /* Description just for me
    To powoduje że metoda _showForm otrzymuje automatycznie argument który tutaj nazywamy clickE
    ten argument można zobaczyć po kliknięciu na mapę (aby odpalić eventhadler) i wpisaniu w konsolę
    to jest obiekt, kóry posiada między innymi właściwość latlng
    */

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  } // ----- END OF LOAD MAP ----

  _eventsWhenMapClicked(clickE) {
    if (editing === true) form.firstChild.remove();
    editing = false;
    this._showForm(clickE);
    this._removeEditSelection();
  }

  _showForm(clickE) {
    this.#clickEvent = clickE;
    console.log(clickE);
    console.log(`Editing status: ${editing}`);

    form.classList.remove('hidden');
    inputDistance.focus();

    // Show forum
    /*  Logging to console
    console.log(
      `You clicked on map, which fires _showForm() and accepts argument object #clickEvent`
    );
    console.log(clickE);*/
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

  _newWorkout(e) {
    e.preventDefault();

    // Used variables
    let lat;
    let lng;
    let workout;

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
    }

    // Check if data is valid (for runninng type)
    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      if (editing === false) {
        workout = new Running([lat, lng], distance, duration, cadence);
      } else if (editing === true) {
        workout = this.#workouts.find(work => work.id === this.#clickEvent.id);
        workout.distance = distance;
        workout.duration = duration;
        workout.cadence = cadence;
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
        return alert('Inputs have to be positive numbers');
      }

      if (editing === false) {
        workout = new Cycling([lat, lng], distance, duration, elevation);
      } else if (editing === true) {
        workout = this.#workouts.find(work => work.id === this.#clickEvent.id);
        workout.distance = distance;
        workout.duration = duration;
        workout.elevation = elevation;
      }
    }

    if (editing === false) {
      // adding new workout to array
      this.#workouts.push(workout);

      // Adding marker on map after submiting the form
      this._renderWorkoutMarker(workout);

      // Render info about workout on the list
      this._renderWorkout(workout);
    }

    // FIXME: zrobić tak żeby ta metoda aktywowała się z tej samej co zwykłe tworzenie workout
    // FIXME: Zrobić tak żeby okna nie skakały po zatwierdzeniu
    // FIXME: Zrobić tak żeby edytowane okno stopniowo powracała do tego samego koloru np 1.5 sec
    if (editing === true) {
      let wotkoutHTML =
        // prettier-ignore
        `<li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <button class="editWorkoutBtn">Edit 🔧</button>
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

      const workoutToEdit = document.querySelector(`[data-id="${workout.id}"]`);
      workoutToEdit.outerHTML = wotkoutHTML;
    }

    // Form hideing after submitting the form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
    editing = false;
  }

  // Adding marker on map after submiting the form
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
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
  }

  _renderWorkout(workout) {
    let wotkoutHTML =
      // prettier-ignore
      `<li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>
        <button class="editWorkoutBtn">Edit 🔧</button>
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

    form.insertAdjacentHTML('afterend', wotkoutHTML);
  } // ---- END OF _renderWorkout ---

  _moveToPop(e) {
    const workoutEl = e.target.closest('.workout'); //this allaws to check for the closest ancestor of klicked element
    /* 
    - tworzy zmienną do której przypisuje najbliższego przodka 
      klikniętego treningu o klasie workout (NIE workouts - bez "s"), czyli:
      eventlistenr nasłuchuje kliknięcia w ul o klasie workouts i jeśłi takie było
      oraz jeśli taki element posiada przodka o klasie workout (bez s) to wtedy
      do zmiennej lokalnej workoutEl przypisywany jest ten element
    */
    // console.log(workoutEl);

    if (!workoutEl) return;
    // jeśli nie ma takiego przodka to zakończ funkcję

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );
    /*przypisuje do zmiennej workout funkcję przeszukania właściwości #workouts 
    która zawiera tablicę obiektów workout, takiego elemetu, który zawiera cechę
    id taką że workoutEL ma takie samo id 

    dlaczego id === dataset.id 
    elemtnty cechy #workout posiadają cechę id, 
    natomiast elemnty DOM posiadają atrybut "data-id"
    */
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: { duration: 1 },
    });
    /* this.#map zawiera obiekt który pochodzi z Feaflet API i 
    dodaje on mapę w podanym elementcie DOM, tutaj poprostu 
    dodajemy do niego odpowieni widok */

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.#workouts = data;
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
    const editHTML = document.querySelector('.editText');
    // console.log(workoutEl);
    // console.log(editBtn);
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
      editHTML?.remove();
    }

    if (secondClick < 2) {
      editing = true;
      // Allow editing
      // remove 'workoutEditeing' class form all workouts from list
      this._removeEditSelection();
      // add to currently editeing workout
      workoutEl.classList.add('workoutEditeing');
      // show form and have currently editeing workout data in memory
      this._showForm(workout);
      this._editingText(workout);
    } else {
      // if (secondClick === 2): Switch off editing
      this._removeEditSelection();
      // delete form discription about editing
      editHTML?.remove();
      secondClick = 0;
      editing = false;
      this._hideForm();
    }
  }

  _removeEditSelection() {
    const allWorkouts = document.querySelectorAll('.workout');
    allWorkouts.forEach(workout => workout.classList.remove('workoutEditeing'));
  }

  _editingText(workout) {
    const htmlEditing = `<p class="editText" style="font-weight: bold; font-size: 1.3em; grid-column-start: 1;
    grid-column-end: span 2;">Edite ${workout.description}</p>`;
    form.style.height = 'unset';
    form.style.minHeight = '9.25rem';
    form.insertAdjacentHTML('afterbegin', htmlEditing);
  }
}

const app = new App();

// TODO: może by tak dodać przycisk powrotu z tworzenia trenigu?
//  musiłby być evenlistener na Cancel aby uktywać form
