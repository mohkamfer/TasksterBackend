import {
  Meteor
} from 'meteor/meteor';
import {
  Exams
} from '../lib/collection/collections.js';
import connectRoute from 'connect-route';

Meteor.startup(() => {
  let userCount = Accounts.users.find({}).fetch().length;
  if (userCount < 1) {
    console.log('No users yet!');
  } else {
    console.log('Found ' + userCount + ' profile' + (userCount > 1 ? 's' : ''));
  }

  let examCount = Exams.find({}).fetch().length;
  if (examCount < 1) {
    console.log('No exams yet!');
  } else {
    console.log('Found ' + examCount + ' exams');
  }
});

WebApp.connectHandlers.use(connectRoute(function (router) {
  router.post('/profile/', function (req, res, next) {
    if (req.headers) {
      let headers = req.headers;
      if (!headers.profile_firstname ||
        !headers.profile_lastname ||
        !headers.profile_username ||
        !headers.profile_email ||
        !headers.profile_password ||
        !headers.profile_day ||
        !headers.profile_month ||
        !headers.profile_year ||
        !headers.profile_gender ||
        !headers.profile_role) {
        res.writeHead(400);
        res.end('Operation needs firstname, lastname, ' +
        'username, email, password, day, month, year, gender and role.');
        return;
      }

      Accounts.createUser({
        firstname: headers.profile_firstname,
        lastname: headers.profile_lastname,
        username: headers.profile_username,
        email: headers.profile_email,
        password: headers.profile_password,
        day: headers.profile_day,
        month: headers.profile_month,
        year: headers.profile_year,
        gender: headers.profile_gender,
        role: headers.profile_role
      });

      res.writeHead(200);
      res.end('1');
    }
  });

  router.get('/profile/:username', function (req, res, next) {
    let user = Accounts.users.findOne({ username: req.params.username });
    if (user) {
      res.writeHead(200);
      res.end(JSON.stringify(user));
    } else {
      res.writeHead(404);
      res.end('No profile found with username ' + req.params.username);
    }
  });

  router.get('/students/', function (req, res, next) {
    let students = Accounts.users.find({ role: 'student' }).fetch();
    if (students) {
      res.writeHead(200);
      res.end(JSON.stringify(students.map(function(student) {
        return {
          userId: student._id,
          firstname: student.firstname,
          lastname: student.lastname,
          gender: student.gender
        };
      })));
    } else {
      res.writeHead(404);
      res.end('No students found');
    }
  });

  router.post('/login/', function (req, res, next) {
    if (req.headers) {
      let headers = req.headers;
      if (!headers.profile_email ||
        !headers.profile_password) {
        res.writeHead(400);
        res.end('Operation needs email + password');
        return;
      }

      let user = Accounts.users.findOne({ 'emails.address': headers.profile_email });
      if (user) {
        let result = Accounts._checkPassword(user, headers.profile_password);
        if (result.error) {
          res.writeHead(500);
          res.end('' + result.error);
        } else {
          res.writeHead(200);
          res.end(result.userId);
          let loginToken = Accounts._generateStampedLoginToken();
          Accounts._insertLoginToken(user._id, loginToken);
        }
      } else {
        res.writeHead(404);
        res.end('User not found');
        return;
      }
    }
  });

  router.post('/logout/', function (req, res, next) {
    if (req.headers) {
      let headers = req.headers;
      if (!headers.profile_userid) {
        res.writeHead(400);
        res.end('Operation needs userId');
        return;
      }

      let user = Accounts.users.findOne({ _id: headers.profile_userid });
      if (user) {
        let result = Accounts._clearAllLoginTokens(headers.profile_userid);
        res.writeHead(200);
        res.end(JSON.stringify(result));
      } else {
        res.writeHead(404);
        res.end('User not found');
        return;
      }
    }
  });

  router.get('/loggedin/', function (req, res, next) {
    if (req.headers) {
      let headers = req.headers;
      if (!headers.profile_userid) {
        res.writeHead(400);
        res.end('Operation needs userId');
        return;
      }

      let user = Accounts.users.findOne({ _id: headers.profile_userid });
      if (user) {
        res.writeHead(200);
        if (user.services.resume.loginTokens) {
          res.end('' + user.services.resume.loginTokens.length);
        } else {
          res.end('0');
        }
      } else {
        res.writeHead(404);
        res.end('User not found');
        return;
      }
    }
  });
}));

Accounts.onCreateUser((options, user) => {
  user.firstname = options.firstname;
  user.lastname = options.lastname;
  user.username = options.username;
  user.email = options.email;
  user.password = options.password;
  user.day = options.day;
  user.month = options.month;
  user.year = options.year;
  user.gender = options.gender;
  user.role = options.role;
  return user;
});