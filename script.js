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
    /* Description of this action just for me 
    weź typ zamień jego pierwszą literą na
    dużą a następnie dołącz do tego miesiąc z pośród tych zawartych w tablicy
    pobierz dzień w zależności od
    i dodaj do tego dzień> */
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
let editing = fase;

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

//////////////////////////////////
// APPLICATION ARCHITECTURE
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
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
    this.#map.on('click', this._showForm.bind(this));
    /* Description just for me
    To powoduje że metoda _showForm otrzymuje automatycznie argument który tutaj nazywamy mapE
    ten argument można zobaczyć po kliknięciu na mapę (aby odpalić eventhadler) i wpisaniu w konsolę
    to jest obiekt, kóry posiada między innymi właściwość latlng
    */

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  } // ----- END OF LOAD MAP ----

  _showForm(mapE) {
    this.#mapEvent = mapE;
    // Show forum
    /*  Logging to console
    console.log(
      `You clicked on map, which fires _showForm() and accepts argument object #mapEvent`
    );
    console.log(mapE);*/
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

  _newWorkout(e) {
    e.preventDefault();

    /*
Zrobić tak że jeśli został wcześniej kliknięty editBtn to 
a dany workout zostaje podświetlony lub zasłonięty prześwitującym obrazkiem klicza mechanicznego
wyświetla się form
na koniec pobierany jest obiekt o danym id i zapisawny do zmiennej
wartości wpisane do form nadpisują stare wartości obiektu.
*/


    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    // const notEmpty = (...inputs) => inputs.every(inp => inp === '');
    /* bierze jakąś tablicę, i dla tej teblicy sprwaza po koleji każdy element
    sprawdza czy element to dokładnie pusty string
    jeśli każdy to pusty string to wtedy daje true
    
    dla elevation === "" nastąpi zamiana na 0 (przez + dla inputElevation.value)
    dlatego trzeba w trakcie definicji zmiennej sprawdzić czy nie zosatł 
    wpisany tam pusty string, a jeśli tak to wartości nie należy zmieniać na
    liczbę czli 0 a zostawić "" :)

    jeśli dodany zostanie warunek dla elevation, że jeśli jest ""
    to NIE zamieniaj na number to działa bez notEmpty()
     */


    // Get data from form

    // Check if data is valid
    const type = inputType.value;
    const distance = +inputDistance.value; // dodanie plusa na początki odrazu przekształci to na liczbę
    const duration = +inputDuration.value;

    if (editing === true) {

      if (type === 'running') {
        const cadence = +inputCadence.value;
  
        /* usatlić jaki to workout  */
        if (
          !validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence)
        ) {
          return alert('Inputs have to be positive numbers');
        }
        // workout = new Running([lat, lng], distance, duration, cadence);
        /* wcześniej w  */
      }
  
      if (type === 'cycling') {
        const elevation =
          inputElevation.value === '' ? '' : +inputElevation.value;
  
        if (
          !validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration)
        ) {
          return alert('Inputs have to be positive numbers');
        }
        // workout = new Cycling([lat, lng], distance, duration, elevation);
      }

    } else {}


    const { lat, lng } = this.#mapEvent.latlng; // to było użyte jako pierwsze w "Adding marker on map" brane jest z obiektu przywołanego eventhandlerem this.#map.on()
    let workout;

    if (type === 'running') {
      const cadence = +inputCadence.value;

      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
      /* Logging to console
      console.log(
        `You submitted the form which generates the workout object with fallowing data:`
      );
      console.log(workout);*/
    }

    if (type === 'cycling') {
      const elevation =
        inputElevation.value === '' ? '' : +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
        // || notEmpty(elevation)
      ) {
        return alert('Inputs have to be positive numbers');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
      /* Logging to console
      console.log(
        `You submitted the form which generates the workout object with fallowing data:`
      );
      console.log(workout);*/
    }
    // Number() oraz isNaN() spacje lub puste stringi zawsze przerabia na 0
    // czyli robi z nich liczbę.

    // TODO: może by tak dodać przycisk powrotu z tworzenia trenigu?

    this.#workouts.push(workout); // ZAPAMIĘTAJ ŻE TO SIĘ TAK ROBI!!!!!!

    // Adding marker on map after submiting the form
    this._renderWorkoutMarker(workout);

    // Render info about workout on the list
    this._renderWorkout(workout);

    // Form hideing after submitting the form
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    // Allow editeing
    this._editWorkout();
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
      wotkoutHTML+=`<div class="workout__details">
<span class="workout__icon">⚡️</span>
<span class="workout__value">${Math.round(workout.pace)}</span>
<span class="workout__unit">min/km</span>
</div>

<div class="workout__details">
<span class="workout__icon">🦶🏼</span>
<span class="workout__value">${workout.cadence}</span>
<span class="workout__unit">spm</span>
</div>
</li>`;}

    // CYCLING
    // prettier-ignore
    if (workout.type === 'cycling') {
      wotkoutHTML+=`<div class="workout__details">
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
    const workoutEl = e.target.closest('.workout'); //this is oposite of the querySelector
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
    const workoutEl = editBtn.closest('.workout');

    if (!editBtn) return;
    editing = true;
    if ()
    // console.log(workoutEl);
    // console.log(editBtn);
    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this._showForm();
    /*
    moja funkcja działa tylko po kliknięciu na editBtn i nigie indziej
    następnie szuka najblżego elementu nadrzędnego z klasą .workout
    następnie trzeba ten workout jakoś zmusić do edycji czyli
    NADPISAĆ obiekt
    1. Zrobić żeby w miejscu w którym jest ten workout pojawiło się to samo co w form 
    2. Po zmianie danych zapisać jako poprzednie ID  
    */
  }
}

const app = new App();

// TODO: musiłby być evenlistener na Cancel aby uktywać form

// TODO: zrobić żeby mapa poruszała się do trenigu który jest wybrany z listy
// wykorzystać dlegację wydarzenia (event delegation)
// dodać eventListenra do workout
