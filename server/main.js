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
  router.post('/profile', function (req, res, next) {
    if (req.headers) {
      let headers = req.headers;
      if (!headers.profile_name ||
        !headers.profile_email ||
        !headers.profile_password ||
        !headers.profile_age ||
        !headers.profile_gender ||
        !headers.profile_role) {
        res.writeHead(400);
        res.end('Operation needs name, ' +
        'email, password, age, gender and role.');
        return;
      }

      Accounts.createUser({
        name: headers.profile_name,
        email: headers.profile_email,
        password: headers.profile_password,
        age: headers.profile_age,
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

  router.get('/students', function (req, res, next) {
    let students = Accounts.users.find({ role: 'student' }).fetch();
    if (students) {
      res.writeHead(200);
      res.end(JSON.stringify(students.map(function(student) {
        return {
          userId: student._id,
          name: student.name,
          gender: student.gender,
          age: student.age
        };
      })));
    } else {
      res.writeHead(404);
      res.end('No students found');
    }
  });

  router.post('/login', function (req, res, next) {
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
          res.end(JSON.stringify({
            _id: user._id,
            email: user.emails[0].address,
            name: user.name,
            gender: user.gender,
            age: user.age,
            role: user.role
          }));
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

  router.post('/logout', function (req, res, next) {
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

  router.get('/loggedin', function (req, res, next) {
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

  router.post('/exam', function (req, res, next) {
    if (req.headers) {
      let headers = req.headers;
      if (!headers.exam_title ||
        !headers.exam_author ||
        !headers.exam_questions) {
        res.writeHead(400);
        res.end('Operation needs exam_title, exam_author and exam_questions!');
        return;
      }

      let questions = headers.exam_questions;
      try {
        questions = JSON.parse(questions);
        if (typeof questions === 'object' && questions.constructor === Array) {
          let examId = Exams.insert({
            title: headers.exam_title,
            author: headers.exam_author,
            questions: questions
          });
  
          res.writeHead(200);
          res.end('' + examId);
        } else {
          res.writeHead(400);
          res.end('exam_questions is not a valid JSON array.');
        }
      } catch (e) {
        res.writeHead(400);
        res.end('exam_questions is not valid JSON.');
      }
    }
  });

  router.get('/exams', function (req, res, next) {
    let exams = Exams.find({}).fetch();
    if (exams) {
      res.writeHead(200);
      res.end(JSON.stringify(exams.map(function(exam) {
        return {
          _id: exam._id,
          title: exam.title,
          author: exam.author
        };
      })));
    } else {
      res.writeHead(404);
      res.end('No exams found');
    }
  });

  router.get('/exam/:id', function (req, res, next) {
    let exam = Exams.findOne({ _id: req.params.id });
    if (exam) {
      res.writeHead(200);
      res.end(JSON.stringify(exam));
    } else {
      res.writeHead(404);
      res.end('Exam not found');
    }
  });

  router.post('/attempt', function (req, res, next) {
    if (req.headers) {
      let headers = req.headers;
      if (!headers.student_id ||
        !headers.student_name ||
        !headers.exam_id ||
        !headers.exam_questions) {
        res.writeHead(400);
        res.end('Operation needs student_id, student_name, exam_id and exam_questions!');
        return;
      }

      let questions = headers.exam_questions;
      try {
        questions = JSON.parse(questions);
        if (typeof questions === 'object' && questions.constructor === Array) {
          let exam = Exams.findOne({ _id: headers.exam_id });
          if (exam) {
            Exams.update({ _id: headers.exam_id }, {
              $push: {
                results: {
                  studentId: headers.student_id,
                  studentName: headers.student_name,
                  questions: JSON.parse(headers.exam_questions)
                }
              }
            });
            res.writeHead(200);
            res.end('');
          } else {
            res.writeHead(404);
            res.end("Exam not found");
          }
        } else {
          res.writeHead(400);
          res.end('exam_questions is not a valid JSON array.');
        }
      } catch (e) {
        res.writeHead(400);
        res.end('exam_questions is not valid JSON.');
      }
    }
  });

  router.get('/results/:id', function (req, res, next) {
    let exams = Exams.find({ "results.studentId": req.params.id }).fetch();
    if (exams) {
      let results = [];
      for (let i = 0; i < exams.length; ++i) {
        let examTitle = exams[i].title;
        let examResults = exams[i].results;
        for (let j = 0; j < examResults.length; ++j) {
          let score = 0;
          let resultQuestions = examResults[j].questions;
          for (let k = 0; k < resultQuestions.length; ++k) {
            let defaultAnswer = resultQuestions[k].default;
            let studentAnswer = resultQuestions[k].answer;
            if (defaultAnswer == studentAnswer) {
              score = score + 1;
            }
          }

          results.push({
            title: examTitle,
            score: score,
            questionCount: resultQuestions.length
          });
          score = 0;
        }
      }

      res.writeHead(200);
      res.end(JSON.stringify(results));
    } else {
      res.writeHead(404);
      res.end('Exam not found');
    }
  });

  router.delete('/exam', function (req, res, next) {
    if (req.headers) {
      let headers = req.headers;
      if (!headers.exam_id) {
        res.writeHead(400);
        res.end('Operation needs exam_id!');
        return;
      }

      let exam = Exams.findOne({ _id: headers.exam_id });
      if (exam) {
        Exams.remove({ _id: headers.exam_id });
        res.writeHead(200);
        res.end('Deleted successfully');
      } else {
        res.writeHead(404);
        res.end('Exam not found');
      }
    }
  });

  router.get('/attempt/:student/:exam', function (req, res, next) {
    let exam = Exams.findOne({ _id: req.params.exam, "results.studentId": req.params.student });
    if (exam) {
      res.writeHead(200);
      res.end('');
    } else {
      res.writeHead(404);
      res.end('');
    }
  });
}));

var examTemplate = {
  questions: [
    { // Question Object
      type: '1', // Multiple Choice
      question: 'Select Choice Below C.',
      default: 3 // Choice C
    }, {
      type: '2', // True or False
      question: 'C++ Is Fun?',
      default: true
    }
  ],
  results: [
    { // Student Result Object
      studentId: 'ABCD', // userId for student
      studentName: 'Mdohas',
      questions: [
        {
          type: '1',
          question: 'Select Choice Below C.',
          default: 3,
          answer: 3 // Correct Answer
        }, {
          type: '2', // True or False
          question: 'C++ Is Fun?',
          default: true,
          answer: false // Wrong Answer
        }
      ]
    }
  ]
};

Accounts.onCreateUser((options, user) => {
  user.name = options.name;
  user.email = options.email;
  user.password = options.password;
  user.age = options.age;
  user.gender = options.gender;
  user.role = options.role;
  return user;
});