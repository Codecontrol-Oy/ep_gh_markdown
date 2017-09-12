describe("Convert markdown", function(){
    //create a new pad before each test run
    beforeEach(function(cb){
      helper.newPad(cb);
      this.timeout(60000);
    });
  
	it("Converts markdown headings", function (done) {
		this.timeout(60000);
		var chrome$ = helper.padChrome$;
		var inner$ = helper.padInner$;

		var $firstElement = inner$("div").first();
		var enter = function () { return $firstElement.sendkeys('{enter}'); }

		// Clears default text.
		var $editorContents = inner$("div").each(function () {
			$(this).sendkeys('{selectall}');
			$(this).sendkeys('{enter}');
		});

		$editorContents.sendkeys('{selectall}');
		$firstElement.sendkeys('# Heading 1');
		enter();
		$firstElement.sendkeys('## Heading 2');
		enter();
		$firstElement.sendkeys('##### Heading 3');
		enter();
		$firstElement.sendkeys('#Incorrect');
		enter();
		$firstElement.sendkeys('#    H1');
		enter();
		$firstElement.sendkeys('Alt-H1');
		enter();
		$firstElement.sendkeys('======');
		//get the bold button and click it
		var $mdBtn = chrome$(".ep_gh_markdown");
		$mdBtn.click();

		// User needs to press ok, cancel fails the test..
		helper.waitFor(function () {
			return chrome$('.ep_gh_markdown').hasClass("clicked");
		}).done(function () {
			helper.waitFor(function () {
				var $firstHeading = inner$('div').first();
				var hasHeading = $firstHeading.find("h1").length;
				return hasHeading == 1;
			}).done(function () {
				// We have already checked first heading, check the rest.
				var $h2 = inner$("div").first().next();
				var $h5 = $h2.next();
				var $incorrect = $h5.next();
				var $multiplespaces = $incorrect.next();
				var $alth1 = $multiplespaces.next();

				expect($h2.find("h2").length).to.be(1);
				expect($h5.find("h5").length).to.be(1);
				expect($incorrect.find("h1").length).to.be(0);
				expect($multiplespaces.find("h1").length).to.be(1);
				expect($alth1.find("h1").length).to.be(1);
				done();
			});
		});
	});

	it("Converts markdown emphasis", function (done) {
		this.timeout(60000);
		var chrome$ = helper.padChrome$;
		var inner$ = helper.padInner$;

		var $firstElement = inner$("div").first();

		// Clears default text.
		var $editorContents = inner$("div").each(function () {
			$(this).sendkeys('{selectall}');
			$(this).sendkeys('{enter}');
		});
		$firstElement.sendkeys('*italics*<br />');
		$firstElement.sendkeys('_italics_<br />');
		$firstElement.sendkeys('**bold**<br />');
		$firstElement.sendkeys('__bold__<br />');
		$firstElement.sendkeys('**combined bold and _italic_**<br />');
		$firstElement.sendkeys('~~strikethrough~~<br />');
		//get the bold button and click it
		var $mdBtn = chrome$(".ep_gh_markdown");
		$mdBtn.click();

		// User needs to press ok, cancel fails the test..
		helper.waitFor(function () {
			return chrome$('.ep_gh_markdown').hasClass("clicked");
		}).done(function () {
			// Need to wait until ep is done with conversion
			helper.waitFor(function () {
				var $italics = inner$('div').first();
				var isItalics = $italics.find("i").length;
				return isItalics == 1;
			}).done(function () {
				var $i2 = inner$("div").first().next();
				var $b = $i2.next();
				var $b2 = $b.next();
				var $combined = $b2.next();
				var $s = $combined.next();
				expect($i2.find("i").length).to.be(1);
				expect($b.find("b").length).to.be(1);
				expect($combined.find("b").length).to.be(2);
				expect($combined.find("i").length).to.be(1);
				expect($s.find("s").length).to.be(1);
				done();
			});
		});
	});

  });
  